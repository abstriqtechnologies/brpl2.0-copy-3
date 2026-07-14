/**
 * Extract the originating client IP from a request, honouring the
 * `TRUSTED_PROXY_HOSTNAMES` allowlist.
 *
 * Why this matters (audit C7):
 *   - Rate-limit buckets must be keyed by an IP the attacker cannot forge.
 *     If we trust `x-forwarded-for` from any host, an attacker spoofs a
 *     fresh IP on every request and never hits the same bucket twice.
 *   - `TRUSTED_PROXY_HOSTNAMES` lets the operator enumerate the load
 *     balancers / CDNs whose `x-forwarded-for` we should respect.
 *     When empty (the default) we trust NO proxy header.
 *
 * Usage:
 *   const ip = getClientIp(req);                              // "1.2.3.4" or "global"
 *   const blocked = enforceRateLimit(limiterFor(...), ip);     // per-IP bucket
 *
 * Browser safety: this helper is called on the server (route handlers,
 * withRateLimit). No `document`, `window`, or `cookies()` references —
 * safe to import from a route module.
 */

/** RFC-1918 / loopback / link-local — never make it past the proxy. */
const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

/**
 * True when the IP is one we'd consider "host-internal" — useful only
 * for diagnostic logs, never as a fallback bucket key for production
 * rate limiting.
 */
function isPrivateOrLoopback(ip: string): boolean {
    if (!IPV4_RE.test(ip)) {
        // IPv6 loopback / private — be conservative.
        if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
            return true;
        }
        return false;
    }
    const parts = ip.split(".").map((n) => Number(n));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
}

function isValidIp(s: string): boolean {
    if (!s) return false;
    if (IPV4_RE.test(s)) {
        const parts = s.split(".").map((n) => Number(n));
        return parts.length === 4 && parts.every((n) => n >= 0 && n <= 255);
    }
    if (IPV6_RE.test(s) && s.includes(":")) {
        // Cheap sanity check; full validation requires the WHATWG URL
        // parser which isn't trivially callable from this file.
        return s.length <= 45;
    }
    return false;
}

/**
 * Read `TRUSTED_PROXY_HOSTNAMES` directly from `process.env`. Mirrors
 * the pattern in `lib/auth/url-guard.ts` — flagged in the .env docs
 * as `TRUSTED_PROXY_HOSTNAMES=brpl.in,api.brpl.in`. Empty → trust no
 * proxy header.
 */
function trustedProxyHostnames(): Set<string> {
    const raw = process.env["TRUSTED_PROXY_HOSTNAMES"];
    if (!raw) return new Set();
    return new Set(
        raw
            .split(",")
            .map((h) => h.trim().toLowerCase())
            .filter((h) => h.length > 0),
    );
}

/**
 * Inspect `host` / `x-forwarded-host` and decide if we trust the proxy's
 * claim. If the request didn't come through a trusted host we cannot
 * honour `x-forwarded-for` at all.
 *
 * `req` is a standard `Request` (Web Fetch API). We accept `host`
 * because Edge / Node runtimes both populate it.
 */
function trustedFromHost(req: Request): boolean {
    const trusted = trustedProxyHostnames();
    if (trusted.size === 0) return false;
    const host = req.headers.get("host") ?? req.headers.get("x-forwarded-host") ?? "";
    const lower = host.toLowerCase().split(":")[0]; // strip port
    if (!lower) return false;
    for (const allowed of trusted) {
        if (lower === allowed) return true;
        if (lower.endsWith(`.${allowed}`)) return true;
    }
    return false;
}

/**
 * Extract a stable per-request IP. Used as the rate-limit bucket key.
 *
 * Returns `"global"` when the IP cannot be determined — better than an
 * arbitrary default (one bucket per missing-IP caller is still better
 * than dropping the limit entirely).
 */
export function getClientIp(req: Request): string {
    if (!trustedFromHost(req)) return "global";

    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        // XFF is a comma-separated chain: client,proxy1,proxy2,...
        // Take the first non-private, valid IP.
        const parts = xff.split(",").map((s) => s.trim());
        for (const p of parts) {
            if (isValidIp(p) && !isPrivateOrLoopback(p)) return p;
        }
        // All hops were private — return the leftmost anyway rather than
        // collapsing to "global" (the attacker can shape XFF, but the
        // leftmost private is at least a deterministic bucket).
        if (parts[0] && isValidIp(parts[0])) return parts[0];
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp && isValidIp(realIp)) return realIp;

    return "global";
}