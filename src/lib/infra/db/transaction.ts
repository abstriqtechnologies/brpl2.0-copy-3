/**
 * Mongoose transaction wrapper with graceful degradation.
 *
 * Audit C3 / H8: money writes across multiple collections (Payment,
 * User, CouponUsage) are NOT atomic. A crash mid-sequence leaves the
 * system in an inconsistent state — e.g. `Coupon.usedCount++` lands
 * but `CouponUsage.create()` does not, so a coupon grant is permanently
 * lost from `usedCount`.
 *
 * This module wraps the critical money paths in `startTransaction` /
 * `commitTransaction` when the underlying MongoDB supports it
 * (replica set / sharded cluster). On a standalone server (where
 * `startTransaction` throws "Transaction numbers are only allowed on a
 * replica set member or mongos"), it falls back to running the callback
 * without a session. The code is **safe to deploy unchanged** to
 * either topology — and the per-event idempotency guards stay in place
 * as a second line of defense.
 *
 * Usage:
 *
 *     await runInTransaction(async (session) => {
 *         await userRepo.update(id, { paymentStatus: "completed" }, { session });
 *         await paymentRepo.updateStatus(paymentId, "completed", { session });
 *     });
 *
 * The `session` argument is `null` on standalone deployments OR when
 * mongoose isn't currently connected (e.g. tests). Repo methods that
 * take `{ session }` should treat `null` as "no session" (mongoose does
 * this automatically for individual ops).
 */

import "server-only";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";

/** Session handle passed to the callback. `null` when not in a txn. */
export type TxnSession = mongoose.ClientSession | null;

/**
 * Run `body` inside a Mongoose transaction when one is feasible, else
 * run it without a session.
 *
 * Fallback conditions (each a no-session path):
 *   - mongoose isn't connected (readyState !== 1) — avoids hangs when
 *     no Mongo is reachable (e.g. CI without a fixture).
 *   - `startSession()` / `startTransaction()` throws (standalone Mongo).
 *
 * Successful path: opens a session, calls `withTransaction` (which
 * auto-retries on TransientTransactionError), commits, ends the session.
 *
 * Failure path: any thrown error inside the body aborts the
 * transaction and rethrows.
 */
export async function runInTransaction<T>(
    body: (session: TxnSession) => Promise<T>,
    opts: { label?: string } = {},
): Promise<T> {
    const label = opts.label ?? "txn";

    // Fast path: driver isn't connected. Skip the session attempt to
    // avoid `startSession()` blocking on a non-existent connection.
    if (mongoose.connection.readyState !== 1) {
        return body(null);
    }

    let session: mongoose.ClientSession | null = null;
    try {
        session = await mongoose.startSession();
        try {
            session.startTransaction();
        } catch {
            // Standalone Mongo or "transactions not supported" — degrade.
            await session.endSession().catch(() => undefined);
            return body(null);
        }
        let result!: T;
        try {
            await session.withTransaction(async () => {
                result = await body(session);
            });
            logger.info("db.transaction_committed", { label });
            return result;
        } catch (err) {
            logger.warn("db.transaction_aborted", { label, err: String(err) });
            throw err;
        }
    } catch (err) {
        // startSession or unexpected outer failure — degrade gracefully.
        logger.warn("db.transaction_unavailable", { label, err: String(err) });
        if (session) await session.endSession().catch(() => undefined);
        return body(null);
    } finally {
        if (session) await session.endSession().catch(() => undefined);
    }
}

/**
 * Test helper: probe whether the current mongoose deployment supports
 * transactions. Returns false when not connected. Used by tests that
 * need to assert the fallback path runs.
 */
export async function txnSupported(): Promise<boolean> {
    if (mongoose.connection.readyState !== 1) return false;
    let session: mongoose.ClientSession | null = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        await session.abortTransaction();
        return true;
    } catch {
        return false;
    } finally {
        if (session) await session.endSession().catch(() => undefined);
    }
}
