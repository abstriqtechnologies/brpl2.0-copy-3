import { revalidateTag } from "next/cache";
import { APP_SETTING_TAG as _APP_SETTING_TAG, revalidateAppSetting as _revalidate, TAGS as _SETTINGS_TAGS } from "@/lib/settings";

export const TAGS = {
    ALL: "site-context",
    SETTINGS: "site-context:settings",
    HOME: "site-context:home",
    ABOUT: "site-context:about",
    REGISTRATION: "site-context:registration",
    LEGAL: "site-context:legal",
    SEO: "site-context:seo",
    PAGE_BANNERS: "site-context:page-banners",
    COLLECTIONS: "site-context:collections",
    MEDIA: "site-context:media",
    // App-settings umbrella tag — fired on every settings write. Defined
    // here (alongside the site-context tags) so callers can import every
    // revalidation tag from one place.
    APP_SETTINGS: "brpl:app-settings",
} as const;

export type SiteTag = (typeof TAGS)[keyof typeof TAGS];

/**
 * Invalidate site-context cache for one or more slices.
 * Always also invalidates the umbrella `site-context` tag.
 */
export function revalidateSite(...tags: SiteTag[]) {
    revalidateTag(TAGS.ALL);
    for (const t of tags) revalidateTag(t);
}

// ---------- App-settings cache invalidation (Phase 1.6) ----------
//
// These are re-exported from `@/lib/settings` so callers / tests have a single
// import surface (`@/lib/revalidate`) for all revalidation primitives.

/** Umbrella tag fired on every settings write — invalidates ALL cached app settings reads. */
export const APP_SETTINGS_TAGS = _SETTINGS_TAGS;

/**
 * Per-key tag for surgical invalidation of `getSetting(key)`.
 * Format is stable and starts with `brpl:app-setting:` — admin settings UI
 * can match this prefix to enumerate key-level invalidations if ever needed.
 */
export function APP_SETTING_TAG(key: Parameters<typeof _APP_SETTING_TAG>[0]): string {
    return _APP_SETTING_TAG(key);
}

/** Invalidate the cached read for a single settings key. */
export function revalidateAppSetting(key: Parameters<typeof _revalidate>[0]): void {
    _revalidate(key);
}