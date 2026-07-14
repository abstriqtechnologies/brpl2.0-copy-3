/**
 * Pure settings-key constants — NO mongoose import.
 *
 * These live in their own module so client components (e.g. the admin
 * SettingsClient) can import the key list and helpers without pulling the
 * mongoose model (and therefore the whole `mongodb` driver, which references
 * Node built-ins like `fs/promises`/`net`/`tls`) into the browser bundle.
 *
 * The mongoose model in `./Setting` re-exports everything here, so existing
 * server-side importers keep working unchanged.
 */

export const SETTINGS_KEYS = [
    "razorpay_key_id",
    "razorpay_key_secret",
    "razorpay_webhook_secret",
    "sms_api_key",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

const SECRET_KEYS: ReadonlyArray<SettingsKey> = [
    "razorpay_key_secret",
    "razorpay_webhook_secret",
    "sms_api_key",
];

export function isSecretKey(key: SettingsKey): boolean {
    return SECRET_KEYS.includes(key);
}
