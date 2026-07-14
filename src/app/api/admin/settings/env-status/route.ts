/**
 * `/api/admin/settings/env-status` — superadmin-only env fallback indicator.
 *
 *   GET → { items: [{ key, hasEnv, envVarName }] }
 *
 * Returns whether each `SettingsKey` has a non-empty env fallback AND the
 * env var NAME (for the chip in the UI). NEVER returns env VALUES.
 *
 * Auth: superadmin.
 */
import { withRequest } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { ForbiddenError, UnauthorizedError } from "@/lib/api/errors";
import { getAdminSession } from "@/lib/jwt";
import { ENV_FALLBACK_NAMES, SETTINGS_KEYS, type SettingsKey } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRequest(async () => {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError("Admin session required");
  if (session.role !== "superadmin") throw new ForbiddenError("Superadmin only");

  const items = SETTINGS_KEYS.map((key) => ({
    key,
    hasEnv: Boolean(ENV_FALLBACK_NAMES[key]()),
    envVarName: ENV_VAR_DISPLAY[key],
  }));

  return ok({ items });
});

const ENV_VAR_DISPLAY: Record<SettingsKey, string> = {
  razorpay_key_id: "RAZORPAY_KEY_ID",
  razorpay_key_secret: "RAZORPAY_KEY_SECRET",
  razorpay_webhook_secret: "RAZORPAY_WEBHOOK_SECRET",
  sms_api_key: "SMS_API_KEY",
};
