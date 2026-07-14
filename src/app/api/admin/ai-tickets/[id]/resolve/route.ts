/**
 * `PUT /api/admin/ai-tickets/[id]/resolve` — mark a ticket as resolved.
 *
 * Security:
 *   - `withAdmin` enforces a verified admin session AND the `content`
 *     access area.
 *   - Body is zod-validated + length-capped. `resolvedBy` is optional and
 *     falls back to the authenticated admin's name.
 *   - Replaces raw `console.error` with the structured `logger.error`
 *     via `withRequest` error handling.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok, BadRequestError, NotFoundError } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import AdminUser, { type IAdminUser } from "@/models/AdminUser";
import AiTicket from "@/models/AiTicket";
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

const resolveSchema = z.object({
    resolvedBy: z.string().trim().min(1).max(80).optional(),
});

export const PUT = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async ({ req, admin }) => {
        const body = await req.json().catch(() => ({}));
        const parsed = resolveSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }

        await connectDB();
        const id = extractId(req);
        const ticket = await AiTicket.findByIdAndUpdate(
            id,
            {
                status: "resolved",
                resolvedAt: new Date(),
                resolvedBy: parsed.data.resolvedBy || admin.name || "Admin",
            },
            { new: true },
        );
        if (!ticket) throw new NotFoundError("Ticket not found");

        // Also update the associated lead status if exists.
        if (ticket.leadId) {
            await AiLead.findByIdAndUpdate(ticket.leadId, { status: "resolved" });
        }

        return ok({ ticket });
    }),
);
