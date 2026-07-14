/**
 * `POST /api/admin/auth/logout` — drop the `Brpl_admin` session cookie.
 *
 * Security:
 *   - Auth gate: requires a verified admin session. Without `withAdmin` a
 *     cross-origin form/POST could clear the cookie on a logged-in admin,
 *     which is the audit-flagged vulnerability (CSRF-style admin-logout
 *     DoS / nuisance).
 */

import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { getAdminCookie, clearAdminCookie } from "@/lib/auth/cookies";
import { connectDB } from "@/lib/mongodb";
import AdminUser, { type IAdminUser } from "@/models/AdminUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

export const POST = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
    })(async () => {
        await clearAdminCookie();
        return ok({ success: true });
    }),
);
