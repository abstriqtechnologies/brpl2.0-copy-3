/**
 * Activity log service.
 *
 * Captures clicks captured on the client and persisted server-side.
 * `recordEvents` resolves the actor (admin → user → anonymous via `brpl_track`
 * cookie) once per batch and bulk-inserts. `listEvents` powers the
 * superadmin viewer at `/admin/activity`.
 *
 * No Mongoose models are constructed directly — this module reads via the
 * `IActivityEvent` model already exposed at `@/models/ActivityEvent`.
 */

import { z } from "zod";
import ActivityEvent, { type IActivityEvent, type ActivityRole } from "@/models/ActivityEvent";
import { getAdminSession } from "@/lib/jwt";
import { getAuthSession } from "@/lib/session";

export const ActivityEventInput = z.object({
    path: z.string().min(1).max(2048),
    target: z.object({
        tag: z.string().min(1).max(32),
        text: z.string().max(100).optional(),
        href: z.string().max(2048).optional(),
    }),
    clientTs: z.number().int(),
});

export const ActivityBatch = z.object({
    events: z.array(ActivityEventInput).min(1).max(100),
});

const TRACK_COOKIE = "brpl_track";

type CookieReader = { cookies: { get: (n: string) => { value: string } | undefined } };

function readCookie(req: CookieReader | null | undefined, name: string): string | undefined {
    if (!req) return undefined;
    try {
        return req.cookies.get(name)?.value;
    } catch {
        return undefined;
    }
}

async function resolveActor(req: CookieReader | null | undefined) {
    const admin = await getAdminSession().catch(() => null);
    if (admin) {
        return {
            userId: admin.sub,
            role: "admin" as ActivityRole,
            sessionId: admin.sub,
        };
    }
    const user = await getAuthSession().catch(() => null);
    if (user) {
        return {
            userId: user.sub,
            role: "user" as ActivityRole,
            sessionId: user.sub,
        };
    }
    const sid = readCookie(req, TRACK_COOKIE) ?? "";
    return { userId: null, role: null as ActivityRole, sessionId: sid };
}

type RecordDeps = {
    events: z.infer<typeof ActivityEventInput>[];
    req: CookieReader | null;
    now?: () => number;
};

export async function recordEvents(deps: RecordDeps) {
    const parsed = ActivityBatch.parse({ events: deps.events });
    const actor = await resolveActor(deps.req ?? null);
    const now = deps.now?.() ?? Date.now();
    const ts = new Date(now);
    const docs = parsed.events.map((e) => ({
        userId: actor.userId ?? null,
        sessionId: actor.sessionId,
        role: actor.role,
        path: e.path,
        target: { tag: e.target.tag, text: e.target.text, href: e.target.href },
        ts,
    }));
    return ActivityEvent.insertMany(docs, { ordered: false });
}

type ListDeps = {
    userId?: string;
    path?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    cursor?: string;
};

export async function listEvents(deps: ListDeps) {
    const limit = Math.min(deps.limit ?? 100, 500);
    const query: Record<string, unknown> = {};
    if (deps.userId) query.userId = deps.userId;
    if (deps.path) {
        const escaped = deps.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.path = { $regex: `^${escaped}` };
    }
    if (deps.from || deps.to) {
        query.ts = {};
        if (deps.from) (query.ts as Record<string, unknown>).$gte = deps.from;
        if (deps.to) (query.ts as Record<string, unknown>).$lte = deps.to;
    }
    if (deps.cursor) query._id = { $lt: deps.cursor };

    const rows = (await ActivityEvent.find(query)
        .sort({ _id: -1 })
        .limit(limit)
        .lean()) as unknown as IActivityEvent[];
    const nextCursor = rows.length === limit ? String(rows[rows.length - 1]._id) : null;
    return { items: rows, nextCursor };
}
