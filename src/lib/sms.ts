import { httpFetch } from "@/lib/api/http-client";
import { env, isDev } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { logger } from "./logger";

/**
 * Send OTP via SMSIndiaHub.
 *
 * `SMS_API_KEY` is read via `getSetting()` (DB → env fallback) so the
 * `/admin/settings` UI can rotate it without redeploys. Other SMS config
 * (`SMS_SENDER_ID`, `SMS_GWID`) stays on env for now.
 *
 * Public shape (`(mobile, otp, otpPurpose?) => Promise<boolean>`) is
 * preserved — callers in `src/app/api/**` inject `sendSmsOtp` into the
 * auth services, which `await` it.
 */
export async function sendSmsOtp(mobile: string, otp: string, otpPurpose: string = "registration"): Promise<boolean> {
    // Normalize to 10-digit Indian mobile
    let formatted = mobile.replace(/\D/g, "");
    if (formatted.length === 12 && formatted.startsWith("91")) formatted = formatted.slice(2);
    if (formatted.length === 11 && formatted.startsWith("0")) formatted = formatted.slice(1);
    if (formatted.length !== 10) {
        logger.warn("[SMS] Invalid mobile length", { mobile });
        return false;
    }
    const withCountryCode = "91" + formatted;

    const apiKey = await getSetting("sms_api_key");
    if (!apiKey) {
        logger.warn("[SMS] SMS_API_KEY not set — dev OTP fallback engaged", { phone: withCountryCode });
        // In dev only, echo the OTP to the server log so the developer can
        // complete the flow without a real SMS provider. Never do this in prod.
        if (isDev()) {
            // eslint-disable-next-line no-console
            console.log(`\n========== DEV OTP ==========`);
            // eslint-disable-next-line no-console
            console.log(`Phone: ${withCountryCode}`);
            // eslint-disable-next-line no-console
            console.log(`OTP:   ${otp}`);
            // eslint-disable-next-line no-console
            console.log(`==============================\n`);
        }
        return true;
    }

    const senderId = env.SMS_SENDER_ID;
    const gwid = env.SMS_GWID;
    const message = `Welcome to the Brpl powered by SMSINDIAHUB. Your OTP for ${otpPurpose} is ${otp}`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://cloud.smsindiahub.in/vendorsms/pushsms.aspx?APIKey=${apiKey}&msisdn=${withCountryCode}&sid=${senderId}&msg=${encodedMessage}&fl=0&dc=0&gwid=${gwid}`;

    try {
        // The endpoint returns a string body (not JSON); httpFetch will
        // hand it back as text since the SMS gateway doesn't set JSON
        // content-type.
        await httpFetch<string>(url, {
            timeoutMs: 10_000,
            maxRetries: 2,
            consecutiveFailures: 3, // SMSIndiaHub occasionally 503s
        });
        logger.info("[SMS] OTP sent", { phone: withCountryCode });
        return true;
    } catch (err) {
        logger.error(
            "[SMS] Error sending OTP",
            { phone: withCountryCode },
            err instanceof Error ? err.message : err,
        );
        return false;
    }
}
