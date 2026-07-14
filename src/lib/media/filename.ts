/**
 * Filename sanitiser used by the admin upload route. Extracted into a pure
 * module so it can be unit-tested without pulling in mongoose / Next
 * server modules.
 *
 * Strips:
 *   - C0 / C1 control characters (0x00-0x1f, 0x7f-0x9f)
 *   - Forward and backward slashes (path-traversal class)
 *   - Windows-forbidden filename characters: < > : " | ? *
 *   - Surrounding whitespace
 *   - Names longer than 200 chars are truncated.
 */
export function sanitizeEchoFilename(name: string): string {
    return name
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
        .replace(/[\\/]/g, "_")
        .replace(/[<>:"|?*]/g, "_")
        .trim()
        .slice(0, 200);
}
