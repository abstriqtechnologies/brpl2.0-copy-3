/**
 * `GET /api/chat/conversation` — return the caller's own AI chat transcript.
 *
 * Security:
 *   - `getAuthSession` enforces a valid user session cookie + DB lookup.
 *   - The `?phone=` query param is NEVER trusted — phone always comes from
 *     `session.user.phone`.
 *   - The `?leadId=` query param is only honoured when it belongs to the
 *     same phone as the session; otherwise we fall back to the most recent
 *     lead for the session phone. This closes the PII-leak vulnerability
 *     where any visitor could fetch any lead's transcript by guessing a
 *     phone or lead id.
 *
 * Status codes:
 *   - 401 — no session.
 *   - 400 — session but neither leadId nor phone in session.
 *   - 200 — returns `{ conversation, leadId, phone, name }` (possibly empty).
 */

import { connectDB } from "@/lib/mongodb";
import AiLead from "@/models/AiLead";
import User from "@/models/User";
import { getAuthSession, type AuthLookup } from "@/lib/auth/session";
import { getAuthCookie } from "@/lib/auth/cookies";
import { ok, BadRequestError, UnauthorizedError } from "@/lib/api/response";
import { withRequest } from "@/lib/api/handlers";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userLookup(id: string) {
    await connectDB();
    const doc = await User.findById(id).lean();
    return doc ? { _id: String(doc._id), phone: doc.phone as string } : null;
}

export const GET = withRequest(async ({ req, requestId }) => {
    const session = await getAuthSession({
        getAuthCookie,
        lookup: userLookup as unknown as AuthLookup,
    });
    if (!session) {
        throw new UnauthorizedError("Authentication required");
    }

    const sessionPhone = session.user.phone;
    if (!sessionPhone) {
        throw new BadRequestError("Session has no associated phone");
    }

    const url = new URL(req.url);
    const requestedLeadId = url.searchParams.get("leadId");

    // `?phone=` is intentionally IGNORED — phone always comes from the session.
    // The test contract is: if the caller supplied `phone=` (even a wrong one),
    // we silently resolve to their own lead. Without any of `?phone=` or
    // `?leadId=`, we have no work to do.
    const hasQuery = url.searchParams.has("phone") || url.searchParams.has("leadId");
    if (!hasQuery) {
        throw new BadRequestError("Provide leadId or phone query parameter");
    }

    await connectDB();

    let lead: Record<string, unknown> | null = null;

    if (requestedLeadId) {
        // Honour leadId only when it belongs to the session phone. Falls
        // back to "most recent lead for this phone" otherwise.
        lead = (await AiLead.findOne({ _id: requestedLeadId, phone: sessionPhone }).lean()) as Record<
            string,
            unknown
        > | null;
        if (!lead) {
            lead = (await AiLead.findOne({ phone: sessionPhone })
                .sort({ createdAt: -1 })
                .lean()) as Record<string, unknown> | null;
        }
    } else {
        lead = (await AiLead.findOne({ phone: sessionPhone })
            .sort({ createdAt: -1 })
            .lean()) as Record<string, unknown> | null;
    }

    if (!lead) {
        return ok({ conversation: [], leadId: null, phone: sessionPhone, name: null });
    }

    const log = logger.child({ requestId, route: "chat/conversation" });
    log.info("conversation.fetched", { leadId: String(lead._id) });

    return ok({
        conversation: (lead.conversation as unknown[]) ?? [],
        leadId: String(lead._id),
        phone: sessionPhone,
        name: (lead.name as string) ?? null,
    });
});