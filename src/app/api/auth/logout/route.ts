/**
 * `POST /api/auth/logout` — drop the user `Brpl_auth` / `Brpl_pending`
 * cookies (and the `Brpl_csrf` token, via `clearAuthCookies`).
 *
 * Wrapped in `withCsrf` so a cross-origin form/POST cannot wipe the
 * session on a logged-in user (audit H4). The CSRF cookie is cleared by
 * `clearAuthCookies`, so even a successful cross-origin logout would
 * need to present the same-site `X-CSRF-Token` header — which a
 * cross-origin attacker cannot read.
 *
 * No `withAuth` gate is needed: the whole point of logout is to clear
 * the session, so a valid auth cookie at the moment of the call is not
 * required (the cookies() helper still has access to the request).
 */

import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { withRequest, withCsrf } from "@/lib/api/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRequest(withCsrf(async () => {
    await clearAuthCookies();
    return NextResponse.json({ success: true });
}));