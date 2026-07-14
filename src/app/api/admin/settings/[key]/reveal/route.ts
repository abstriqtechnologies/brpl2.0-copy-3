/**
 * `/api/admin/settings/[key]/reveal` — superadmin-only reveal of a secret value.
 *
 *   GET /api/admin/settings/:key/reveal  →  { key, value | null }
 *
 * Auth: superadmin. Returns 404 for keys outside SETTINGS_KEYS.
 *
 * NOTE: `withRequest` doesn't forward Next.js route params, so we extract
 * `key` from the URL path here. Matches the convention used by other
 * `withRequest`-wrapped `[id]` routes.
 */

import { withRequest } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/api/errors";
import { connectDB } from "@/lib/mongodb";
import { getAdminSession } from "@/lib/jwt";
import Setting, { SETTINGS_KEYS, type SettingsKey } from "@/models/Setting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pull the second-to-last path segment: `/api/admin/settings/<key>/reveal`.
 * Path is `/api/admin/settings/<key>/reveal`, so `parts[parts.length - 2]` is `key`.
 */
function extractKey(req: Request): string {
    const parts = new URL(req.url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 2] ?? "";
}

export const GET = withRequest(async ({ req }) => {
    const session = await getAdminSession();
    if (!session) throw new UnauthorizedError("Admin session required");
    if (session.role !== "superadmin") throw new ForbiddenError("Superadmin only");

    const key = extractKey(req);
    if (!SETTINGS_KEYS.includes(key as SettingsKey)) {
        throw new NotFoundError("Unknown setting key");
    }

    await connectDB();
    const row = await Setting.findOne({ key: key as SettingsKey }).lean();
    return ok({ key, value: (row as any)?.value ?? null });
});