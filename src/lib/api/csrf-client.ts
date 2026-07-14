/**
 * Client-side CSRF helpers.
 *
 * The double-submit cookie pattern works like this:
 *   - The server sets a non-httpOnly cookie `Brpl_csrf` containing a
 *     random token at every login / registration.
 *   - The client reads that cookie via `document.cookie` and echoes it
 *     in the `X-CSRF-Token` header on every mutating request.
 *   - The server compares cookie vs header via `withCsrf` /
 *     `assertCsrf`.
 *
 * This file is browser-only. It must NOT import `next/headers`,
 * `crypto`, or any "server-only" module — it ships in the client bundle.
 *
 * Use `fetchCsrf(url, init)` for any POST / PUT / PATCH / DELETE; it
 * transparently injects the header. For GET requests `fetchCsrf` is a
 * no-op pass-through (CSRF is a write-protection, not a read-protection).
 */

/** Cookies that should always carry the CSRF header when mutated. */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Read the current value of the `Brpl_csrf` cookie. Returns `undefined`
 * if the cookie is missing (e.g. before the first login). The cookie is
 * intentionally non-httpOnly so this is safe.
 */
export function getCsrfToken(): string | undefined {
    if (typeof document === "undefined") return undefined;
    const name = "Brpl_csrf=";
    const parts = document.cookie ? document.cookie.split(";") : [];
    for (const raw of parts) {
        const seg = raw.trim();
        if (seg.startsWith(name)) {
            return decodeURIComponent(seg.slice(name.length));
        }
    }
    return undefined;
}

/**
 * Return the headers that should be attached to a mutating request to
 * satisfy `withCsrf`. Returns `undefined` when there is no token (caller
 * can decide whether to send the request anyway — usually the answer is
 * "no, surface a 401 to the UI" but the helper does not enforce that).
 */
export function csrfHeaders(): Record<string, string> | undefined {
    const token = getCsrfToken();
    if (!token) return undefined;
    return { "X-CSRF-Token": token };
}

/**
 * Wrapper around `fetch` that auto-injects the CSRF header on mutating
 * requests. Safe to call from any component / hook — does nothing extra
 * for GET / HEAD / OPTIONS.
 *
 * IMPORTANT: callers that need to set their own headers should merge:
 *
 *   fetchCsrf(url, {
 *     method: "POST",
 *     headers: { "content-type": "application/json", ...csrfHeaders()! },
 *     body: JSON.stringify(payload),
 *   });
 *
 * Or simpler: just use `fetchCsrf` and let it handle the header. The
 * existing `httpFetch` server helper has its own variant of this logic.
 */
export async function fetchCsrf(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const method = (init.method ?? "GET").toUpperCase();
    if (!MUTATING_METHODS.has(method)) return fetch(input, init);

    const token = getCsrfToken();
    if (!token) {
        // No cookie → no header. The server will 403 with `csrfRequired()`,
        // which is the correct behaviour for a logged-out / cookie-cleared
        // browser. Surfacing it here would just be a worse error message.
        return fetch(input, init);
    }

    const headers = new Headers(init.headers ?? undefined);
    // Don't clobber a header the caller set deliberately.
    if (!headers.has("X-CSRF-Token") && !headers.has("x-csrf-token")) {
        headers.set("X-CSRF-Token", token);
    }
    return fetch(input, { ...init, headers });
}
