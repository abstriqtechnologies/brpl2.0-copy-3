/**
 * `/api/admin/subadmins/[id]` — superadmin-gated single-subadmin ops.
 *
 *   PATCH  — partial update (name, accessAreas, active).
 *   DELETE — soft-deactivate (active=false).
 *
 * Security:
 *   - `withRequest(withAdmin(...))` enforces a verified admin session AND
 *     `superadmin` role. Subadmins (even those with content-area access)
 *     get 403.
 *
 * NOTE: `withRequest` doesn't forward Next.js route params, so we extract
 * `id` from the URL path. Matches the pattern in `/api/admin/blogs/[id]`.
 */

import { z } from "zod";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { connectDB } from "@/lib/mongodb";
import { getAdminCookie } from "@/lib/auth/cookies";
import { ACCESS_AREAS } from "@/lib/access-areas";
import AdminUser, { type IAdminUser } from "@/models/AdminUser";
import { updateSubadmin, deactivateSubadmin } from "@/lib/domain/admin-rbac/service";
import { MongooseAdminRepo } from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const repo = () => new MongooseAdminRepo();

function extractId(req: Request): string {
    return new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
}

const PatchBody = z.object({
    name: z.string().min(1).max(80).optional(),
    accessAreas: z.array(z.enum(ACCESS_AREAS)).min(1).optional(),
    active: z.boolean().optional(),
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

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const id = extractId(req);
        const doc = await repo().findById(id);
        if (!doc) throw new NotFoundError("Admin not found");
        return ok({ subadmin: serializeSubadmin(doc) });
    }),
);

export const PATCH = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const body = await req.json().catch(() => null);
        const parsed = PatchBody.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }

        const id = extractId(req);
        const updated = await updateSubadmin({ adminRepo: repo(), id, patch: parsed.data });
        return ok({ subadmin: serializeSubadmin(updated) });
    }),
);

export const DELETE = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        allowedRoles: ["superadmin"],
    })(async ({ req }) => {
        const id = extractId(req);
        const updated = await deactivateSubadmin({ adminRepo: repo(), id });
        return ok({ subadmin: serializeSubadmin(updated) });
    }),
);
