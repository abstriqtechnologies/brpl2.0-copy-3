/**
 * Superadmin-only `GET /api/admin/activity`.
 *
 * Lists persisted activity events with optional filters and cursor-based
 * pagination. Auth: superadmin only.
 *
 * Query params (all optional):
 *   userId  — filter by actor user id
 *   path    — prefix-match against `path` (regex-escaped)
 *   from    — ISO date; only events with ts >= from
 *   to      — ISO date; only events with ts <= to
 *   limit   — 1..500, defaults to 100
 *   cursor  — opaque _id; returns events with _id < cursor
 */
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { listEvents } from "@/lib/domain/activity/service";
import { connectDB } from "@/lib/mongodb";
import AdminUser from "@/models/AdminUser";
import { getAdminCookie } from "@/lib/auth/cookies";
import type { IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const url = new URL(req.url);
        const userId = url.searchParams.get("userId") ?? undefined;
        const path = url.searchParams.get("path") ?? undefined;
        const fromStr = url.searchParams.get("from");
        const toStr = url.searchParams.get("to");
        const limitStr = url.searchParams.get("limit");
        const cursor = url.searchParams.get("cursor") ?? undefined;

        const result = await listEvents({
            userId,
            path,
            from: fromStr ? new Date(fromStr) : undefined,
            to: toStr ? new Date(toStr) : undefined,
            limit: limitStr ? Number(limitStr) : undefined,
            cursor,
        });
        return ok(result);
    }),
);
