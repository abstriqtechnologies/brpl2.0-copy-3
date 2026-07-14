/**
 * `PUT /api/admin/ai-context/[id]`     — update an existing AI context doc.
 * `DELETE /api/admin/ai-context/[id]`  — delete an AI context doc.
 *
 * Security:
 *   - `withAdmin` enforces a verified admin session AND the `content`
 *     access area.
 *   - PUT body is zod-validated:
 *       title   — trim, 1..200 chars
 *       content — trim, 1..8000 chars (length cap closes the
 *                 "prompt-bomb" vector flagged in the audit)
 *       isActive — boolean
 *   - Replaces raw `console.error` with the structured `logger.error`
 *     via `withRequest` error handling.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok, BadRequestError, NotFoundError } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import AdminUser, { type IAdminUser } from "@/models/AdminUser";
import AiContext from "@/models/AiContext";

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

const updateSchema = z.object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(8000),
    isActive: z.boolean().optional(),
});

export const PUT = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async ({ req }) => {
        const body = await req.json().catch(() => ({}));
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }

        await connectDB();
        const updated = await AiContext.findByIdAndUpdate(
            extractId(req),
            parsed.data,
            { new: true },
        );
        if (!updated) throw new NotFoundError("Context not found");
        return ok({ context: updated });
    }),
);

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async ({ req }) => {
        await connectDB();
        const doc = await AiContext.findById(extractId(req));
        if (!doc) throw new NotFoundError("Context not found");
        return ok({ context: doc });
    }),
);

export const DELETE = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async ({ req }) => {
        await connectDB();
        const deleted = await AiContext.findByIdAndDelete(extractId(req));
        if (!deleted) throw new NotFoundError("Context not found");
        return ok({ deleted: true });
    }),
);
