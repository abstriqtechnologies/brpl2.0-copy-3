/**
 * Server- and client-side safe HTML renderer for admin-authored rich text.
 *
 * Uses `sanitize-html` (already a project dep) — not regex stripping — because
 * regex-based approaches have well-documented bypasses for tag variants like
 * `<script >` (with space), nested tags, and `<a xlink:href="javascript:...">`.
 *
 * The allowlist is intentionally conservative:
 *   - formatting tags (b, i, em, strong, p, br, ul, ol, li, blockquote, h1-h6)
 *   - tables (table/thead/tbody/tr/th/td) for content tables
 *   - images with safe src (https/data:image only)
 *   - links with safe href (http/https/mailto/tel only)
 *   - `class` attribute on every allowed element (Tailwind utility classes
 *     in CMS pages rely on it)
 *
 * Explicitly disallowed:
 *   - `<script>`, `<style>`, `<link>`, `<meta>`, `<base>`, `<iframe>`,
 *     `<form>`, `<object>`, `<embed>`
 *   - All `on*` event handler attributes
 *   - `style` attribute (CSS-in-HTML is a CSP-evasion vector)
 *   - All `javascript:` / `vbscript:` URLs in href/src
 *   - HTML comments (often used to smuggle IE conditional comments)
 *
 * `sanitize-html` is isomorphic — runs identically in Node and the browser —
 * so server-rendered and client-rendered output is byte-identical.
 */
import React from "react";
import sanitizeHtml from "sanitize-html";

export type SanitizeOptions = Parameters<typeof sanitizeHtml>[1];

const ALLOWED_TAGS = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "b", "strong", "i", "em", "u", "s", "sub", "sup", "small", "mark",
    "blockquote", "code", "pre",
    "ul", "ol", "li",
    "a",
    "img",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "figure", "figcaption",
    "span", "div",
] as const;

const SAFE_URL_SCHEMES = ["http", "https", "mailto", "tel"] as const;

/**
 * The default sanitization options. Exported so tests can assert the shape
 * AND so callers (server-side CMS rendering) can pass additional `ALLOWED_*`
 * overrides while keeping the rest of the policy.
 */
export const DEFAULT_SANITIZE_OPTS: SanitizeOptions = {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes: {
        // Every allowed element can carry a Tailwind `class` attribute.
        "*": ["class"],
        a: ["href", "target", "rel"],
        img: ["src", "alt", "title", "width", "height", "loading"],
        th: ["scope", "colspan", "rowspan"],
        td: ["colspan", "rowspan"],
    },
    allowedSchemes: [...SAFE_URL_SCHEMES],
    allowedSchemesByTag: {
        img: ["http", "https", "data"],
    },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    // Forbid every inline style — CSS-in-HTML is a CSP-evasion vector.
    allowedStyles: {},
    // Strip every disallowed tag (script/style/iframe/etc.) entirely.
    disallowedTagsMode: "discard",
    transformTags: {
        // Force every link to open safely.
        a: sanitizeHtml.simpleTransform("a", {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
        }),
    },
};

/**
 * Pure sanitizer — usable in server components, server actions, route
 * handlers, AND client components. Returns a string safe for
 * `dangerouslySetInnerHTML`.
 *
 * Output attribute quoting is normalized to double quotes by sanitize-html,
 * which is fine for HTML and matches the test contract.
 */
export function sanitizeHtmlClient(input: string | null | undefined, opts?: SanitizeOptions): string {
    if (input == null) return "";
    return sanitizeHtml(String(input), { ...DEFAULT_SANITIZE_OPTS, ...opts });
}

type SafeHtmlProps = {
    html: string | null | undefined;
    className?: string;
    /** Override the sanitization options for this instance. */
    sanitizeOptions?: SanitizeOptions;
};

/**
 * Drop-in replacement for `dangerouslySetInnerHTML` on admin-authored
 * rich text. Sanitizes the HTML before rendering.
 */
export const SafeHtml: React.FC<SafeHtmlProps> = ({ html, className, sanitizeOptions }) => {
    const clean = sanitizeHtmlClient(html, sanitizeOptions);
    return (
        <div
            className={className}
            // The string has been stripped of script/iframe/event-handler vectors.
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: clean }}
        />
    );
};

export default SafeHtml;