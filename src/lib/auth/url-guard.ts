/**
 * Allowlist-based URL guards for CMS-sourced URLs (image src, video src,
 * CTA href). Rejects dangerous schemes (javascript:, data:, vbscript:,
 * file:, …) and open-redirect risks (protocol-relative //evil.com).
 *
 * Production policy: only `https:` is allowed for absolute URLs. Dev/staging
 * permits `http:` for local testing. The split closes the
 * mixed-content + HSTS-bypass vector where a CMS admin pastes
 * `http://attacker.example/logo.png` and victims load it over HTTPS.
 *
 * Reads NODE_ENV directly from `process.env` (NOT the env proxy) so test
 * suites can flip prod ↔ dev in `beforeEach` without forcing a full env
 * reparse. The trade-off: if NODE_ENV is mutated at runtime outside tests,
 * the cache in `@/lib/env` will be out of sync — but the env var is
 * fixed at boot, so this is purely a test affordance.
 */

const PROD_PROTOCOLS = new Set(["https:"]);
const DEV_PROTOCOLS = new Set(["https:", "http:"]);

function isProdEnv(): boolean {
    // Read NODE_ENV from `process.env` (NOT the cached env proxy) so test
    // suites can flip prod ↔ dev in `beforeEach` without forcing a full
    // env reparse. The env var is fixed at boot in production, so this
    // is purely a test affordance.
    const raw = process.env["NODE_ENV"];
    if (!raw) return false;
    return raw.trim().toLowerCase() === "production";
}

function allowedProtocols(): Set<string> {
    return isProdEnv() ? PROD_PROTOCOLS : DEV_PROTOCOLS;
}

export function safeUrl(input: string | undefined | null): string | undefined {
    if (!input || typeof input !== "string") return undefined;
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    // Reject protocol-relative URLs up front — `//evil.com/x` is an open
    // redirect / mixed-content vector and must never reach a CMS-sourced
    // src/href. The leading slash that LOOKS like a same-origin path is
    // a prefix match for protocol-relative too.
    if (trimmed.startsWith("//")) return undefined;
    // Same-origin path: /uploads/foo.png
    if (trimmed.startsWith("/")) return trimmed;
    try {
        const u = new URL(trimmed);
        if (!allowedProtocols().has(u.protocol)) return undefined;
        return u.toString();
    } catch {
        return undefined;
    }
}

export function safeHref(input: string | undefined | null): string | undefined {
    if (!input || typeof input !== "string") return undefined;
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("//")) return undefined;
    if (trimmed.startsWith("/")) return trimmed;
    if (trimmed.startsWith("mailto:")) return trimmed;
    if (trimmed.startsWith("tel:")) return trimmed;
    try {
        const u = new URL(trimmed);
        if (!allowedProtocols().has(u.protocol)) return undefined;
        return u.toString();
    } catch {
        return undefined;
    }
}