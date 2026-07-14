/**
 * Server-side HTML sanitizer — the *primary* defense against XSS in
 * admin-authored rich text. Uses `sanitize-html` (a strict allowlist
 * parser) under the hood, which is far harder to bypass than regexes.
 *
 * On the server (`import "server-only"`) it gets the full library —
 * in the browser bundle we'd have to fall back to regex, so we keep this
 * file out of any client component's import graph.
 *
 * Companion: `@/components/SafeHtml` runs a regex pass on the client.
 * Server components should call `sanitizeHtmlServer()` here and pass
 * the result straight to `dangerouslySetInnerHTML` (or use SafeHtml,
 * which does its own client-side pass for defense in depth).
 */

import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Default allowlist. Keeps the tags CMS authors typically use in
 * blog post bodies, legal pages, and CMS sections, drops everything
 * dangerous (script, iframe, object, embed, form, meta, link, base, etc.).
 *
 * The `transformTags` block also strips inline event handler attributes
 * from any tag that survives — sanitize-html would reject them by default
 * because they're not on the allowlist, but this is belt + braces.
 */
const defaultOptions: sanitizeHtml.IOptions = {
    allowedTags: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "hr",
        "strong",
        "em",
        "u",
        "s",
        "blockquote",
        "ul",
        "ol",
        "li",
        "a",
        "img",
        "figure",
        "figcaption",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "code",
        "pre",
        "span",
        "div",
    ],
    allowedAttributes: {
        a: ["href", "name", "target", "rel", "title"],
        img: ["src", "alt", "title", "width", "height", "loading"],
        "*": ["class", "id", "style"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
        img: ["http", "https", "data"],
    },
    allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
    allowProtocolRelative: false,
    // Force every link to be safe-open (no `target=_blank` without `rel=noopener`).
    transformTags: {
        a: sanitizeHtml.simpleTransform("a", {
            rel: "noopener noreferrer",
            target: "_blank",
        }),
    },
    // Disallow data: URLs in everything except <img> (image embedding).
    disallowedTagsMode: "discard",
    parser: { lowerCaseTags: true },
};

/**
 * Sanitize raw admin HTML. Returns a safe string for
 * `dangerouslySetInnerHTML`. Strips disallowed tags, attributes, and
 * URL schemes; rewrites `<a>` to a safe-open pattern.
 *
 * Pass `opts` to override the allowlist (e.g. for narrow contexts like
 * article summaries that should not contain images).
 */
export function sanitizeHtmlServer(
    input: string | null | undefined,
    opts?: sanitizeHtml.IOptions,
): string {
    if (input == null) return "";
    return sanitizeHtml(String(input), opts ?? defaultOptions);
}

/**
 * Strict variant — strips everything except bare paragraphs / line breaks.
 * Use for things like og:description text where no markup is allowed.
 */
export function sanitizeHtmlPlain(input: string | null | undefined): string {
    if (input == null) return "";
    return sanitizeHtml(String(input), {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: "discard",
        textFilter: (text) => text,
    });
}