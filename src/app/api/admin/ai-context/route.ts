/**
 * `GET  /api/admin/ai-context`     — list AI context docs.
 * `POST /api/admin/ai-context`     — create a new AI context doc.
 *
 * Security:
 *   - Both routes require an admin session via `withAdmin({area:"content"})`.
 *     Without this gate, any visitor could write to the system prompt
 *     (`chat/send` interpolates active contexts into `systemPrompt`) — the
 *     audit-flagged "prompt-injection sink".
 *   - POST body is zod-validated:
 *       title   — trim, 1..200 chars
 *       content — trim, 1..8000 chars (length cap closes the
 *                 "prompt-bomb" vector flagged in the audit)
 *       isActive — boolean, optional, defaults to true
 *   - `content` is HTML-stripped before storing so an admin who pastes rich
 *     text doesn't accidentally smuggle `<script>` tags into the LLM
 *     context. Plain text survives — the model still has useful context.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import AiContext from "@/models/AiContext";
import AdminUser, { type IAdminUser } from "@/models/AdminUser";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok, BadRequestError } from "@/lib/api/response";
import { getAdminCookie } from "@/lib/auth/cookies";
import { sanitizeHtmlPlain } from "@/lib/api/html-sanitizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function adminLookup(id: string): Promise<IAdminUser | null> {
    await connectDB();
    const doc = await AdminUser.findById(id).lean();
    return doc as unknown as IAdminUser | null;
}

const postSchema = z.object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(8000),
    isActive: z.boolean().optional(),
});

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async () => {
        await connectDB();
        const contexts = await AiContext.find().sort({ createdAt: -1 }).lean();
        return ok({ contexts });
    }),
);

export const POST = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async ({ req }) => {
        const body = await req.json().catch(() => ({}));
        const parsed = postSchema.safeParse(body);
        if (!parsed.success) {
            throw new BadRequestError("Invalid input", { details: parsed.error.issues });
        }

        const safe = {
            ...parsed.data,
            content: sanitizeHtmlPlain(parsed.data.content),
        };

        await connectDB();
        const context = await AiContext.create(safe);
        return ok({ context }, { status: 201 });
    }),
);