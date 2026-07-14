/**
 * Settings accessor — wraps the `Setting` collection so /admin/settings can
 * rotate secrets (Razorpay keys, SMS key) without a redeploy.
 *
 * Resolution order:
 *   1. Mongo `Setting` row for the key (if present + non-empty).
 *   2. The `ENV_FALLBACK` for that key, if any (read from `process.env`).
 *   3. `undefined`.
 *
 * The whole read is wrapped in `unstable_cache` so a single request can fetch
 * every setting without hammering MongoDB. The cache is tagged with both
 * `TAGS.APP_SETTINGS` (umbrella — revalidates EVERY setting) and
 * `APP_SETTING_TAG(key)` (per-key — revalidates just one). `/admin/settings`
 * mutations call `revalidateAppSetting(key)` which fires both tags.
 */

import { unstable_cache } from "next/cache";
import Setting, { SETTINGS_KEYS, type SettingsKey, type ISetting, isSecretKey } from "@/models/Setting";
import { revalidateTag } from "next/cache";

const ENV_FALLBACK: Record<SettingsKey, () => string | undefined> = {
    razorpay_key_id: () => process.env.RAZORPAY_KEY_ID,
    razorpay_key_secret: () => process.env.RAZORPAY_KEY_SECRET,
    razorpay_webhook_secret: () => process.env.RAZORPAY_WEBHOOK_SECRET,
    sms_api_key: () => process.env.SMS_API_KEY,
};

/**
 * Public re-export of the env fallback closures under a clearer name so the
 * `/api/admin/settings/env-status` route can read whether each `SettingsKey`
 * has an env fallback without forking the lookup map. The closures return
 * the env value (truthy check → `hasEnv`); the route supplies the var NAME
 * separately via `ENV_VAR_DISPLAY`.
 *
 * YAGNI — duplicates `ENV_FALLBACK`. Collapse both maps in a future cleanup
 * pass if/when more env-backed settings land.
 */
export const ENV_FALLBACK_NAMES: Record<SettingsKey, () => string | undefined> = {
    razorpay_key_id: () => process.env.RAZORPAY_KEY_ID,
    razorpay_key_secret: () => process.env.RAZORPAY_KEY_SECRET,
    razorpay_webhook_secret: () => process.env.RAZORPAY_WEBHOOK_SECRET,
    sms_api_key: () => process.env.SMS_API_KEY,
};

type LeanSetting = Pick<ISetting, "value">;

/** Umbrella tag fired on every settings write — invalidates ALL cached reads. */
export const TAGS = {
    APP_SETTINGS: "brpl:app-settings",
} as const;

/**
 * Per-key tag for surgical invalidation. The format is stable so the admin UI
 * can compute the tag without importing this module (it never does — it's
 * only used by the cache machinery).
 */
export function APP_SETTING_TAG(key: SettingsKey): string {
    return `brpl:app-setting:${key}`;
}

/**
 * Invalidate the cached read for a single settings key. Fires both the
 * per-key tag AND the umbrella tag so concurrent reads of every other key
 * also flush.
 */
export function revalidateAppSetting(key: SettingsKey): void {
    revalidateTag(APP_SETTING_TAG(key));
    revalidateTag(TAGS.APP_SETTINGS);
}

async function readSettingFromDb(key: SettingsKey): Promise<string | undefined> {
    try {
        const row = (await Setting.findOne({ key }).lean()) as LeanSetting | null;
        if (row && typeof row.value === "string" && row.value.length > 0) return row.value;
        return undefined;
    } catch {
        // Swallow DB errors (timeout, no connection, unauthenticated IP
        // against Atlas, etc.) and let the caller fall back to the env
        // value. A transient Mongo blip should NOT turn into a red error
        // in the request log on every cache miss.
        return undefined;
    }
}

function readSettingFromEnv(key: SettingsKey): string | undefined {
    const envVal = ENV_FALLBACK[key]();
    return envVal && envVal.length > 0 ? envVal : undefined;
}

// `unstable_cache` is global per-process and shared across requests. Wrapping
// the read here gives us per-key memoisation + tag-based invalidation. The
// revalidate window is 5 min — short enough that admins see their writes
// within 5 min even if the revalidateTag call somehow doesn't propagate.
const cachedRead = (key: SettingsKey) =>
    unstable_cache(
        async () => {
            // `??` does NOT unwrap Promises — a falsy Promise would short-
            // circuit the env fallback. Always await first.
            const fromDb = await readSettingFromDb(key);
            return fromDb ?? readSettingFromEnv(key);
        },
        ["app-setting", key],
        { tags: [TAGS.APP_SETTINGS, APP_SETTING_TAG(key)], revalidate: 300 },
    );

export async function getSetting(key: SettingsKey): Promise<string | undefined> {
    return cachedRead(key)();
}

export async function getSecretSetting(key: SettingsKey): Promise<string | undefined> {
    if (!isSecretKey(key)) throw new Error(`Key ${key} is not a secret`);
    return cachedRead(key)();
}

export { SETTINGS_KEYS };
export type { SettingsKey };

/**
 * Test-only helper — kept as a no-op alias for legacy callers that imported
 * `__resetMemoForTests` against the old memo-based implementation. The
 * `unstable_cache`-backed design no longer needs a process-local reset (each
 * `unstable_cache` call creates a new wrapper, and the stub in tests
 * returns the inner fn without memoising).
 *
 * Exists so `tests/settings.test.ts` keeps working without touching its
 * `beforeEach`.
 */
export const __resetMemoForTests = (): void => {
    // intentional no-op
};