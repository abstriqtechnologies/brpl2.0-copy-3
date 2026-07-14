/**
 * `GET /api/admin/ai-leads` — paginated list of AI leads.
 *
 * Security:
 *   - `withAdmin` enforces a verified admin session AND the `content`
 *     access area (subadmins without `content` get 403; superadmin always
 *     passes).
 *   - Search and status query params are passed through zod with explicit
 *     length caps. The `search` value is regex-escaped before being
 *     interpolated into a Mongo `$regex` query (closes the ReDoS vector
 *     flagged in the audit — `(a+)+$` style payloads are neutralised).
 *   - Replaces raw `console.error` with the structured `logger.error`
 *     via `withRequest` error handling.
 */

import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { withRequest, withAdmin } from "@/lib/api/handlers";
import { ok, BadRequestError } from "@/lib/api/response";
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

/** Escape characters that have special meaning inside a `$regex` pattern. */
function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const querySchema = z.object({
    status: z.enum(["active", "resolved", "escalated", "all"]).default("all"),
    search: z.string().trim().max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = withRequest(
    withAdmin({
        getAdminCookie,
        lookup: adminLookup,
        area: "content",
    })(async ({ req }) => {
        await connectDB();
        const url = new URL(req.url);
        const parsed = querySchema.safeParse({
            status: url.searchParams.get("status") ?? undefined,
            search: url.searchParams.get("search") ?? undefined,
            page: url.searchParams.get("page") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
        });
        if (!parsed.success) {
            throw new BadRequestError("Invalid query", { details: parsed.error.issues });
        }
        const { status, search, page, limit } = parsed.data;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};
        if (status && status !== "all") {
            filter.status = status;
        }
        if (search) {
            const safe = escapeRegex(search);
            filter.$or = [
                { name: { $regex: safe, $options: "i" } },
                { phone: { $regex: safe, $options: "i" } },
            ];
        }

        const [leads, total] = await Promise.all([
            AiLead.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AiLead.countDocuments(filter),
        ]);

        return ok({
            leads,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    }),
);
