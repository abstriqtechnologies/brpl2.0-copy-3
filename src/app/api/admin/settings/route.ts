/**
 * `/api/admin/settings` — superadmin-only CRUD for the typed Settings store.
 *
 *   GET  /api/admin/settings  →  { items: [{ key, secret, isSet, updatedAt }] }
 *                               (no values — secrets are revealed via /reveal)
 *   POST /api/admin/settings  body { key, value }
 *                            →  upsert the row; `{ key, isSet: true }`.
 *
 * Auth: superadmin.
 */

import { z } from "zod";
import { withRequest } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "@/lib/api/errors";
import { connectDB } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/jwt";
import Setting, { SETTINGS_KEYS, isSecretKey, type SettingsKey } from "@/models/Setting";
import AdminUser from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
    key: z.enum(SETTINGS_KEYS as unknown as [SettingsKey, ...SettingsKey[]]),
    value: z.string().min(1).max(4096),
});

export const POST = withRequest(async ({ req }) => {
    const session = await getAdminSession();
    if (!session) throw new UnauthorizedError("Admin session required");
    if (session.role !== "superadmin") throw new ForbiddenError("Superadmin only");

    await connectDB();

    const json = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(json);
    if (!parsed.success) {
        throw new BadRequestError("Invalid input", { details: parsed.error.issues });
    }

    await Setting.findOneAndUpdate(
        { key: parsed.data.key },
        {
            $set: {
                value: parsed.data.value,
                secret: isSecretKey(parsed.data.key),
                updatedBy: session.sub,
            },
        },
        { upsert: true, new: true },
    ).lean();

    return ok({ key: parsed.data.key, isSet: true });
});

export const GET = withRequest(async () => {
    const session = await getAdminSession();
    if (!session) throw new UnauthorizedError("Admin session required");
    if (session.role !== "superadmin") throw new ForbiddenError("Superadmin only");

    await connectDB();

    const rows = await Setting.find({}).lean();
    const byKey = new Map((rows as any[]).map((r: any) => [r.key, r]));

    // Resolve updatedBy → AdminUser lookup (single batch).
    const updaterIds = Array.from(
        new Set((rows as any[])
            .map((r: any) => r.updatedBy)
            .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)),
    );
    const adminById = new Map<string, { name?: string; email?: string }>();
    if (updaterIds.length > 0) {
        const admins = await AdminUser.find({ _id: { $in: updaterIds } }, { name: 1, email: 1 }).lean();
        for (const a of admins as any[]) {
            adminById.set(String(a._id), { name: a.name, email: a.email });
        }
    }

    const items = SETTINGS_KEYS.map((key) => {
        const r = byKey.get(key);
        const updater = r?.updatedBy ? adminById.get(String(r.updatedBy)) : undefined;
        return {
            key,
            secret: isSecretKey(key),
            isSet: !!r,
            updatedAt: r?.updatedAt ? r.updatedAt.toISOString() : null,
            updatedBy: r?.updatedBy
                ? { id: String(r.updatedBy), name: updater?.name, email: updater?.email }
                : null,
        };
    });
    return ok({ items });
});