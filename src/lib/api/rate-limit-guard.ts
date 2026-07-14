/**
 * Inline rate-limit guard for routes that don't go through the standard
 * `withRequest → withRateLimit → handler` wrapper chain.
 *
 * Returns a `NextResponse` (HTTP 429 with `Retry-After`) when the bucket
 * is empty, or `null` when the request should proceed. Usage:
 *
 *     export async function POST(req: NextRequest) {
 *         const blocked = enforceRateLimit(limiterFor("payment-redeem"), req);
 *         if (blocked) return blocked;
 *         ...
 *     }
 *
 * Bucket keys are derived from the client IP via `@/lib/api/client-ip`
 * — i.e. per-IP enforcement by default. Pass an explicit key (e.g.
 * a session id) to share a bucket across multiple requests from the
 * same logical user.
 *
 * For multi-instance deploys, the underlying limiter is in-memory and
 * does not share buckets across processes. The Redis-backed upgrade is
 * documented as a follow-up — see comments in `lib/api/rate-limit.ts`.
 */

import { NextResponse } from "next/server";
import type { RateLimiter } from "./rate-limit";
import { getClientIp } from "./client-ip";

export function enforceRateLimit(
    limiter: RateLimiter,
    reqOrKey: Request | string,
): NextResponse | null {
    const key = typeof reqOrKey === "string" ? reqOrKey : getClientIp(reqOrKey);
    if (limiter.take(key, 1)) return null;
    return new NextResponse(
        JSON.stringify({
            ok: false,
            error: "Too many requests. Please slow down and try again shortly.",
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(limiter.getRetryAfter(key)),
            },
        },
    );
}