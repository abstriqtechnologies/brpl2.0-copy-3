/**
 * Public `POST /api/activity`.
 *
 * Accepts a batch of click events from the client-side `<ActivityTracker />`
 * and persists them via the activity service.
 *
 * Security:
 *   - Auth gate: caller must have a verified `Brpl_auth` cookie. Anonymous
 *     DoS / spam is rejected at the wrapper layer.
 *   - Rate-limit: 60/min per IP from the `public-write` bucket.
 *   - Input validation: zod schema with hard caps on event count and
 *     string field lengths (closes the "100 events per request" mass-event
 *     DoS vector flagged in the audit).
 *
 * Response shape:
 *   { ok: true, data: { count } }   on success
 *   (validation / auth failures flow through @/lib/api/response)
 */

import { z } from "zod";
import { withRequest, withAuth, withRateLimit } from "@/lib/api/handlers";
import { limiterFor } from "@/lib/api/rate-limit";
import { ok } from "@/lib/api/response";
import { parse } from "@/lib/api/parse";
import { recordEvents } from "@/lib/domain/activity/service";
import User, { type IUser } from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventSchema = z.object({
    path: z.string().min(1).max(2048),
    target: z.object({
        tag: z.string().min(1).max(32),
        text: z.string().max(100).optional(),
        href: z.string().max(2048).optional(),
    }),
    clientTs: z.number().int(),
});

const batchSchema = z.object({
    events: z.array(eventSchema).min(1).max(100),
});

async function userLookup(id: string): Promise<IUser | null> {
    const doc = await User.findById(id).lean();
    return doc as unknown as IUser | null;
}

export const POST = withRequest(
    withRateLimit({ capacity: 60, refillPerSec: 1 }, limiterFor("public-write"))(
        withAuth({ lookup: userLookup })(async ({ req }) => {
            const body = parse(await req.json().catch(() => ({})), batchSchema);
            // recordEvents accepts a NextRequest-shaped cookie reader.
            await recordEvents({ events: body.events, req: req as unknown as Parameters<typeof recordEvents>[0]["req"] });
            return ok({ count: body.events.length });
        }),
    ),
);
