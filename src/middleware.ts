import { NextResponse, type NextRequest } from "next/server";
import { verifyPending, type PendingTokenPayload } from "@/lib/auth/crypto";
import { verifyAuthAndUser, type UserLookup } from "@/lib/auth/session-guard";

const PROTECTED_PREFIXES = ["/dashboard"];
const PENDING_OR_UNPAID_PREFIXES = ["/checkout"];
const AUTH_PATHS = ["/login"];

function matchesAny(pathname: string, list: string[]) {
    return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

async function readPending(req: NextRequest): Promise<PendingTokenPayload | null> {
    const token = req.cookies.get("Brpl_pending")?.value;
    if (!token) return null;
    return verifyPending(token);
}

function safeNext(next: string | null, fallback: string): string {
    if (!next) return fallback;
    if (!next.startsWith("/")) return fallback;
    if (next.startsWith("//")) return fallback;
    return next;
}

function redirectTo(req: NextRequest, pathname: string, search: Record<string, string>) {
    const url = req.nextUrl.clone();
    const target = new URL(pathname, req.url);
    url.pathname = target.pathname;
    url.search = target.search;
    for (const [k, v] of Object.entries(search)) {
        url.searchParams.set(k, v);
    }
    return NextResponse.redirect(url);
}

function currentPathWithSearch(req: NextRequest): string {
    return `${req.nextUrl.pathname}${req.nextUrl.search}`;
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Edge-runtime: no MongoDB access. Treat any structurally valid JWT as
    // "valid" here; the page-level `getAuthSession()` does the real DB check
    // and redirects when the user is missing. This is intentional — see
    // /docs/superpowers/specs/2026-06-26-registration-flow-happy-path-design.md.
    const lookup: UserLookup = async (id: string) => ({ _id: id, phone: "" });

    const authResult = await verifyAuthAndUser(req.cookies.get("Brpl_auth")?.value, lookup);

    /* --- /login --- */
    if (matchesAny(pathname, AUTH_PATHS)) {
        if (authResult.kind === "valid") {
            const target = safeNext(
                req.nextUrl.searchParams.get("next"),
                authResult.payload.paid ? "/dashboard" : "/checkout",
            );
            return redirectTo(req, target, {});
        }
        if (authResult.kind === "expired") {
            const res = NextResponse.next();
            res.cookies.delete("Brpl_auth");
            return res;
        }
        return NextResponse.next();
    }

    /* --- /checkout: pending cookie OR auth+unpaid. --- */
    //
    // We do NOT short-circuit "already paid" requests here on the JWT `paid`
    // claim. The middleware cannot read the DB (edge runtime), so when the JWT
    // drifts from the DB the JWT-only redirect creates an infinite
    // /dashboard ↔ /checkout loop. The /checkout page itself does a DB-backed
    // `getAuthSession()` and redirects paid users to /dashboard — that is the
    // only place that can safely make the decision. Middleware just enforces
    // "must be authenticated" here.
    if (matchesAny(pathname, PENDING_OR_UNPAID_PREFIXES)) {
        if (authResult.kind === "expired" || authResult.kind === "user_missing") {
            // Stale or expired JWT: clear the cookie and send the user to /login.
            // This breaks the loop where a stale JWT referencing a deleted user
            // bounces between /checkout and /login.
            const res = redirectTo(req, "/login", { next: currentPathWithSearch(req) });
            res.cookies.delete("Brpl_auth");
            return res;
        }
        const pending = await readPending(req);
        if (pending) return NextResponse.next();
        if (authResult.kind === "valid") {
            // Authenticated request — let the page run. The page does a DB-backed
            // `getAuthSession()` and redirects already-paid users back to
            // /dashboard. We intentionally trust the page here instead of the
            // JWT `paid` claim (which can drift from the DB and cause the
            // /dashboard ↔ /checkout loop we are fixing).
            return NextResponse.next();
        }
        return redirectTo(req, "/login", { next: currentPathWithSearch(req) });
    }

    /* --- /dashboard: auth+paid only. --- */
    if (matchesAny(pathname, PROTECTED_PREFIXES)) {
        if (authResult.kind !== "valid") {
            const res = redirectTo(req, "/login", { next: pathname });
            if (authResult.kind === "expired" || authResult.kind === "user_missing") {
                res.cookies.delete("Brpl_auth");
            }
            return res;
        }
        if (authResult.payload.paid === true) return NextResponse.next();
        return redirectTo(req, "/checkout", { next: pathname });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/login/:path*", "/checkout", "/checkout/:path*"],
};
