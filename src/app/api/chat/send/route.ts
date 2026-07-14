/**
 * POST /api/chat/send
 *
 * Receives a chat message from a visitor, runs it through OpenAI, and
 * persists the user + AI turn back onto the matching AiLead.
 *
 * Security:
 *   - Auth: must have a verified `Brpl_auth` cookie (the user must be a
 *     paid/registered Brpl attendee — anonymous chat is no longer
 *     supported, closes the cost-bomb vector flagged in the audit).
 *   - Rate-limit: 60/min per IP from the `public-write` bucket PLUS a
 *     per-user daily OpenAI budget (50/day). The per-user budget is
 *     process-local; multi-instance deploys would need a shared counter,
 *     but each instance's 50/day hard cap keeps spend manageable.
 *   - Input validation: zod schema with length caps.
 *   - Existing escalation logic preserved.
 */

import { z } from "zod";
import { withRequest, withAuth, withRateLimit } from "@/lib/api/handlers";
import { limiterFor } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { BadRequestError, UpstreamError } from "@/lib/api/errors";
import { parse } from "@/lib/api/parse";
import { logger } from "@/lib/logger";
import AiContext from "@/models/AiContext";
import AiLead, { type IAiLead } from "@/models/AiLead";
import AiTicket from "@/models/AiTicket";
import User, { type IUser } from "@/models/User";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(10).max(20),
    message: z.string().trim().min(1).max(2000), // max chars pre-OpenAI
    leadId: z.string().optional(),
});

/** Per-user per-day OpenAI budget. Reset at 00:00 local. */
const DAILY_OPENAI_BUDGET = 50;
const budgetMap = new Map<string, { count: number; resetAt: number }>();

function userDailyBudget(userId: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    const state = budgetMap.get(userId);
    if (!state || now >= state.resetAt) {
        const nextReset = new Date();
        nextReset.setHours(24, 0, 0, 0);
        budgetMap.set(userId, { count: 1, resetAt: nextReset.getTime() });
        return { allowed: true, retryAfterSec: 0 };
    }
    if (state.count >= DAILY_OPENAI_BUDGET) {
        return { allowed: false, retryAfterSec: Math.ceil((state.resetAt - now) / 1000) };
    }
    state.count += 1;
    return { allowed: true, retryAfterSec: 0 };
}

async function userLookup(id: string): Promise<IUser | null> {
    const doc = await User.findById(id).lean();
    return doc as unknown as IUser | null;
}

const chatLimiter = limiterFor("public-write");

export const POST = withRequest(
    withRateLimit({ capacity: 60, refillPerSec: 1 }, chatLimiter)(
        withAuth({ lookup: userLookup })(async ({ req, user }) => {
            const budget = userDailyBudget(String(user._id));
            if (!budget.allowed) {
                return new Response(
                    JSON.stringify({
                        ok: false,
                        code: "BUDGET_EXCEEDED",
                        message: `Daily chat budget exceeded; retry in ${budget.retryAfterSec}s`,
                    }),
                    {
                        status: 429,
                        headers: { "Retry-After": String(budget.retryAfterSec) },
                    },
                );
            }

            const body = parse(await req.json().catch(() => ({})), schema);
            const { name, phone, message, leadId } = body;

            // Bound the chat search to the authenticated user's phone — a
            // user can only ever chat about their own lead.
            if (user.phone && phone && user.phone !== phone) {
                throw new BadRequestError("Phone does not match authenticated user");
            }

            let lead: IAiLead | null = null;
            if (leadId) {
                lead = await AiLead.findOne({ _id: leadId, phone: phone });
            }
            if (!lead) {
                lead = await AiLead.findOne({ phone });
            }
            if (!lead) {
                lead = new AiLead({ name, phone, conversation: [], status: "active" });
            } else if (lead.name !== name) {
                lead.name = name;
            }
            if (!lead) {
                throw new Error("Failed to create or load lead");
            }
            const activeLead: IAiLead = lead;

            activeLead.conversation.push({ role: "user", message, timestamp: new Date() });

            const contexts = await AiContext.find({ isActive: true }).lean();
            const contextText = contexts
                .map((c) => c.content)
                .filter(Boolean)
                .join("\n\n");

            const lowerMsg = message.trim().toLowerCase();
            const isGreeting = /^(hi|hello|hey|hii|hola|namaste|namaskar|good\s+(morning|afternoon|evening))[\s!.,]*$/i.test(
                lowerMsg,
            );

            const systemPrompt = `You are a helpful assistant for Brpl. Be precise and humble. Answer based on the context provided. If you cannot answer, reply with: "I have escalated your query to our team — they will get back to you shortly."

For simple greetings like "hi", "hello", "hey", just greet back warmly without escalation.

Context:
${contextText || "No context configured yet."}`;

            const conversationHistory = activeLead.conversation.map((m) => ({
                role: m.role === "ai" ? "assistant" : "user",
                content: m.message,
            }));

            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...conversationHistory,
                    ],
                    temperature: 0.3,
                    max_tokens: 400,
                }),
            });

            if (!openaiRes.ok) {
                const errText = await openaiRes.text();
                logger.error("[chat/send] OpenAI error", { error: errText });
                throw new UpstreamError("AI service unavailable");
            }

            const openaiData = await openaiRes.json();
            const aiReply: string = openaiData?.choices?.[0]?.message?.content?.trim() ?? "";

            activeLead.conversation.push({ role: "ai", message: aiReply, timestamp: new Date() });

            let ticketCreated = false;

            const looksLikeEscalation =
                aiReply.toLowerCase().includes("support agent") ||
                aiReply.toLowerCase().includes("our agent") ||
                aiReply.toLowerCase().includes("our team") ||
                aiReply.toLowerCase().includes("escalated your query");

            if (looksLikeEscalation && !isGreeting) {
                activeLead.status = "escalated";
                const ticket = await AiTicket.create({
                    leadId: activeLead._id,
                    name: activeLead.name,
                    phone: activeLead.phone,
                    issue: message,
                    status: "open",
                });
                activeLead.ticketId = ticket._id;
                ticketCreated = true;
            }

            await activeLead.save();

            return ok({
                reply: aiReply,
                leadId: activeLead._id.toString(),
                ticketCreated,
            });
        }),
    ),
);
