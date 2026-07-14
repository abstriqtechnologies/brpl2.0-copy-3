/**
 * Cookie helpers for the three auth identities.
 *
 * Server-only. Wraps Next.js's `cookies()` API to set/get/clear the
 * `Brpl_auth`, `Brpl_pending`, and `Brpl_admin` cookies.
 *
 * Every cookie is `httpOnly`, `sameSite=lax`, and scoped to `/`. The
 * `Secure` flag is set based on the actual request protocol (HTTPS), not
 * NODE_ENV — so `http://localhost:3000` in production-mode still works
 * for local testing, while HTTPS production deploys get the Secure flag
 * as browsers require.
 *
 * The TTL is provided by the caller via `maxAge` so the helpers can be
 * reused with different expiry durations.
 *
 * CSRF cookie: every successful login/registration also issues the
 * `Brpl_csrf` double-submit cookie via `issueCsrfCookie()`. The cookie is
 * non-httpOnly so the client can echo it as `X-CSRF-Token`; route handlers
 * wrapped with `withCsrf` compare cookie vs header. `clearAuthCookies` /
 * `clearAdminCookie` drop the CSRF cookie too so logout cleans up.
 */

import "server-only";
import { cookies, headers } from "next/headers";
import { issueCsrfCookie, clearCsrfCookie } from "@/lib/api/csrf";

export const COOKIE_NAMES = {
    AUTH: "Brpl_auth",
    PENDING: "Brpl_pending",
    ADMIN: "Brpl_admin",
} as const;

/**
 * Detect whether the current request came in over HTTPS. Reads
 * `x-forwarded-proto` (set by reverse proxies, load balancers, and most
 * hosting platforms) and `x-forwarded-ssl` as a backup.
 *
 * If the helper is called outside a request context (e.g. during
 * background jobs), we can't detect a protocol, so we default to
 * `secure=true` — the safer choice for production.
 */
async function isHttpsRequest(): Promise<boolean> {
    try {
        const h = await headers();
        const proto = h.get("x-forwarded-proto")?.toLowerCase().split(",")[0].trim();
        if (proto === "https") return true;
        if (h.get("x-forwarded-ssl") === "on") return true;
        return false;
    } catch {
        // No request context (e.g. background job). Default to secure.
        return true;
    }
}

/** Build a cookie-options object with the given TTL (seconds). */
export async function authCookieOptions(maxAgeSec: number) {
    return {
        httpOnly: true,
        secure: await isHttpsRequest(),
        sameSite: "lax" as const,
        path: "/",
        maxAge: maxAgeSec,
    };
}

export async function setAuthCookie(token: string, ttlSec = 7 * 24 * 60 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.AUTH, token, await authCookieOptions(ttlSec));
    // Issue / refresh CSRF token alongside the auth cookie. Idempotent —
    // safe to call on every login / cookie refresh.
    await issueCsrfCookie();
}

export async function setPendingCookie(token: string, ttlSec = 30 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.PENDING, token, await authCookieOptions(ttlSec));
    // Pending-cookie holders can hit /api/auth/register and
    // /api/payment/* (withCsrf on those routes), so they need a CSRF
    // token too. Same TTL as the pending cookie.
    await issueCsrfCookie();
}

export async function setAdminCookie(token: string, ttlSec = 8 * 60 * 60): Promise<void> {
    const c = await cookies();
    c.set(COOKIE_NAMES.ADMIN, token, await authCookieOptions(ttlSec));
    // Admin sessions hit many mutating endpoints; same lifecycle as auth.
    await issueCsrfCookie();
}

export async function getAuthCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.AUTH)?.value;
}

export async function getPendingCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.PENDING)?.value;
}

export async function getAdminCookie(): Promise<string | undefined> {
    const c = await cookies();
    return c.get(COOKIE_NAMES.ADMIN)?.value;
}

/**
 * Clear both user-side cookies (auth + pending). Does NOT touch admin.
 * Also drops the CSRF token — a logged-out browser should not be able to
 * submit a `X-CSRF-Token` header that the server still recognises.
 */
export async function clearAuthCookies(): Promise<void> {
    const c = await cookies();
    c.delete(COOKIE_NAMES.AUTH);
    c.delete(COOKIE_NAMES.PENDING);
    await clearCsrfCookie();
}

/** Clear only the pending cookie (used after upgrade to full auth). */
export async function clearPendingCookie(): Promise<void> {
    const c = await cookies();
    c.delete(COOKIE_NAMES.PENDING);
}

/** Clear only the admin cookie (and the CSRF token). */
export async function clearAdminCookie(): Promise<void> {
    const c = await cookies();
    c.delete(COOKIE_NAMES.ADMIN);
    await clearCsrfCookie();
}
