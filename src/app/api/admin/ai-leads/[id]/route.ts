/**
 * `GET /api/admin/ai-leads/[id]` — fetch a single AI lead.
 *
 * Security:
 *   - `withAdmin` enforces a verified admin session AND the `content`
 *     access area.
 *   - Replaces raw `console.error` with the structured `logger.error`
 *     via `withRequest` error handling.
 */

import { connectDB } from "@/lib/mongodb";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok, NotFoundError } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import AdminUser, { type IAdminUser } from "@/models/AdminUser";
import AiLead from "@/models/AiLead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

function extractId(req: Request): string {
    return new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
}

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async ({ req }) => {
        await connectDB();
        const lead = await AiLead.findById(extractId(req)).lean();
        if (!lead) throw new NotFoundError("Lead not found");
        return ok({ lead });
    }),
);
