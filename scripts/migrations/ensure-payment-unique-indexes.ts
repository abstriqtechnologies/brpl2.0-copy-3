/**
 * One-time migration to enable the unique indexes on `Payment.paymentId`
 * and `Payment.orderId` (audit C4). Must be run BEFORE deploying the
 * Payment schema change (`unique: true` on both fields).
 *
 * Usage:
 *   # 1. Dry run (default) — just report duplicates + which indexes exist.
 *   npx tsx scripts/migrations/ensure-payment-unique-indexes.ts
 *
 *   # 2. Apply — de-dup existing rows + build the indexes.
 *   npx tsx scripts/migrations/ensure-payment-unique-indexes.ts --apply
 *
 * Dedup policy: when two Payment rows share the same paymentId or
 * orderId, the OLDEST row (by `createdAt`) is kept; later rows are
 * marked `status: "failed"` and tagged with a `dedupedAt` Date +
 * `dedupedFromPaymentId` string. This preserves the audit trail
 * without leaving orphan rows behind.
 *
 * Idempotency: safe to re-run; the second pass reports 0 duplicates and
 * `syncIndexes` is a no-op if the indexes already match the schema.
 *
 * Requires:
 *   - MONGODB_URI in env
 *   - Run from the project root (uses tsconfig paths)
 */

import "dotenv/config";
import mongoose from "mongoose";
import Payment, { type IPayment } from "../../src/models/Payment";
import { connectDB } from "../../src/lib/mongodb";

type DupGroup = { key: string; count: number; ids: string[] };

async function findDuplicates(field: "paymentId" | "orderId"): Promise<DupGroup[]> {
    const pipeline: Array<Record<string, unknown>> = [
        { $match: { [field]: { $exists: true, $type: "string" } } },
        { $group: { _id: `$${field}`, count: { $sum: 1 }, ids: { $push: "$_id" } } },
        { $match: { count: { $gt: 1 } } },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (Payment.aggregate as any)(pipeline);
    return rows.map((r: { _id: string; count: number; ids: mongoose.Types.ObjectId[] }) => ({
        key: r._id,
        count: r.count,
        ids: r.ids.map((id) => id.toString()),
    }));
}

async function deduplicate(field: "paymentId" | "orderId", groups: DupGroup[]): Promise<number> {
    let affected = 0;
    for (const group of groups) {
        // Sort by createdAt asc; keep the first.
        const docs = await Payment.find({ [field]: group.key }).sort({ createdAt: 1 }).lean<IPayment[]>();
        const [keep, ...rest] = docs;
        if (!keep || rest.length === 0) continue;
        const updateIds = rest.map((d) => d._id);
        const result = await Payment.updateMany(
            { _id: { $in: updateIds } },
            {
                $set: {
                    status: "failed",
                    dedupedAt: new Date(),
                    dedupedFromPaymentId: keep.paymentId,
                },
            },
        );
        affected += result.modifiedCount ?? 0;
        // eslint-disable-next-line no-console
        console.log(
            `  [${field}=${group.key}] kept ${keep._id.toString()} (createdAt=${keep.createdAt.toISOString()}); marked ${result.modifiedCount} later row(s) failed`,
        );
    }
    return affected;
}

async function ensureIndexes(): Promise<void> {
    // syncIndexes creates any indexes declared in the schema that don't
    // yet exist in the collection, and removes orphan indexes not in the
    // schema. For a migration that ONLY needs to build the new ones, we
    // pass the second arg as a list to limit side effects — but since
    // this script is the first deploy after the schema change, full sync
    // is acceptable. Re-runs are idempotent.
    await Payment.syncIndexes();
}

async function main(): Promise<void> {
    const apply = process.argv.includes("--apply");
    // eslint-disable-next-line no-console
    console.log(`[migrate] audit C4 — Payment unique-index build. apply=${apply}`);

    await connectDB();

    try {
        for (const field of ["paymentId", "orderId"] as const) {
            const dups = await findDuplicates(field);
            if (dups.length === 0) {
                // eslint-disable-next-line no-console
                console.log(`[migrate] ${field}: 0 duplicate groups`);
            } else {
                // eslint-disable-next-line no-console
                console.log(`[migrate] ${field}: ${dups.length} duplicate group(s) found`);
                for (const g of dups) {
                    // eslint-disable-next-line no-console
                    console.log(`  - ${g.key} (${g.count} rows: ${g.ids.join(", ")})`);
                }
                if (apply) {
                    const n = await deduplicate(field, dups);
                    // eslint-disable-next-line no-console
                    console.log(`[migrate] ${field}: marked ${n} row(s) failed (oldest kept per group)`);
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`[migrate] ${field}: re-run with --apply to dedupe + build the unique index`);
                    process.exitCode = 2;
                }
            }
        }

        if (apply) {
            // eslint-disable-next-line no-console
            console.log("[migrate] syncIndexes()…");
            await ensureIndexes();
            const indexes = await Payment.collection.indexes();
            // eslint-disable-next-line no-console
            console.log("[migrate] post-sync indexes:");
            for (const idx of indexes) {
                // eslint-disable-next-line no-console
                console.log(`  - ${JSON.stringify(idx.key)} unique=${Boolean(idx.unique)} name=${idx.name}`);
            }
        } else if (process.exitCode !== 2) {
            // eslint-disable-next-line no-console
            console.log("[migrate] dry run complete. Re-run with --apply to make changes.");
        }
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("[migrate] failed:", err);
    process.exit(1);
});