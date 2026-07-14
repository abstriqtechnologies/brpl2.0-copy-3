/**
 * `/api/admin/subadmins` — superadmin-gated CRUD for subadmins.
 *
 *   POST   — create a subadmin (active:false, awaiting first OTP login).
 *   GET    — list all subadmins.
 *
 * Security:
 *   - `withRequest(withAdmin(...))` composition enforces a verified admin
 *     session AND `superadmin` role (others get 403).
 *   - Rate-limit: POST is throttled via the `admin-action` bucket (60/min).
 *   - Replaces raw `console.error` with the structured `logger.error`
 *     via `withRequest` error handling.
 */

import { z } from "zod";
import { withRequest, withAdmin, withRateLimit } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { limiterFor } from "@/lib/api/rate-limit";
import { connectDB } from "@/lib/mongodb";
import { ACCESS_AREAS } from "@/lib/access-areas";
import { getAdminCookie } from "@/lib/auth/cookies";
import AdminUser, { type IAdminUser } from "@/models/AdminUser";
import { createSubadmin, listSubadmins } from "@/lib/domain/admin-rbac/service";
import { MongooseAdminRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const repo = () => new MongooseAdminRepo();

const CreateBody = z.object({
    phone: z.string().min(10).max(20),
    name: z.string().min(1).max(80),
    accessAreas: z.array(z.enum(ACCESS_AREAS)).min(1),
});

function serializeSubadmin(a: {
    _id: unknown;
    name: string;
    phone?: string;
    accessAreas?: string[];
    active: boolean;
}) {
    return {
        id: String(a._id),
        name: a.name,
        phone: a.phone ?? "",
        accessAreas: a.accessAreas ?? [],
        active: a.active,
    };
}

export const POST = withRequest(
    withRateLimit({ capacity: 60, refillPerSec: 1 }, limiterFor("admin-action"))(
        withAdmin({
            getAdminCookie,
            lookup: adminLookup,
            allowedRoles: ["superadmin"],
        })(async ({ req }) => {
            const body = await req.json().catch(() => null);
            const parsed = CreateBody.safeParse(body);
            if (!parsed.success) {
                throw new BadRequestError("Invalid input", { details: parsed.error.issues });
            }

            const created = await createSubadmin({
                adminRepo: repo(),
                phone: parsed.data.phone,
                name: parsed.data.name,
                accessAreas: parsed.data.accessAreas,
            });

            return ok({ subadmin: serializeSubadmin(created) }, { status: 201 });
        }),
    ),
);

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async () => {
        const items = await listSubadmins({ adminRepo: repo() });
        return ok({ items: items.map(serializeSubadmin) });
    }),
);
