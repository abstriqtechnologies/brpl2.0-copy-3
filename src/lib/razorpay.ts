import crypto from "crypto";
import Razorpay from "razorpay";
import { getSetting } from "@/lib/settings";

export const REGISTRATION_AMOUNT_PAISE = 1499 * 100; // ₹1499
export const REGISTRATION_AMOUNT_RUPEES = 1499;
export const REGISTRATION_CURRENCY = "INR";

/**
 * Build a Razorpay client from DB-backed settings (falls back to env).
 * Returns `null` when either key is missing — callers must surface a
 * clear error in that case rather than constructing a fake client.
 */
export async function getRazorpayClient(): Promise<Razorpay | null> {
    const [keyId, keySecret] = await Promise.all([
        getSetting("razorpay_key_id"),
        getSetting("razorpay_key_secret"),
    ]);
    if (!keyId || !keySecret) return null;
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Create a Razorpay order. Throws if Razorpay is not configured.
 * Secret lookup happens at call-time so DB writes via /admin/settings
 * take effect without a server restart.
 */
export async function createRazorpayOrder(opts: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
}) {
    const client = await getRazorpayClient();
    if (!client) {
        // Fail loud: previously the route silently forwarded a placeholder
        // client and the SDK threw "Authentication failed" at runtime —
        // confusing because the misconfiguration is server-side.
        throw new Error("Razorpay not configured (razorpay_key_id / razorpay_key_secret missing)");
    }
    return client.orders.create(opts);
}

/**
 * Verify the checkout signature returned to the client after payment.
 * Secret is passed in by the caller — read via `getSetting(...)` at the
 * call site so it can be `undefined` and we still return `false`.
 */
export async function verifyRazorpaySignature(deps: {
    orderId: string;
    paymentId: string;
    signature: string;
    secret: string;
}): Promise<boolean> {
    if (!deps.secret) return false;
    const body = deps.orderId + "|" + deps.paymentId;
    const expected = crypto.createHmac("sha256", deps.secret).update(body).digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(deps.signature));
    } catch {
        return false;
    }
}

/**
 * Verify a server-to-server webhook signature.
 */
export async function verifyRazorpayWebhook(deps: {
    body: string;
    signature: string;
    secret: string;
}): Promise<boolean> {
    if (!deps.secret) {
        // eslint-disable-next-line no-console
        console.warn("[Razorpay] webhook signature verification skipped — no secret");
        return false;
    }
    const expected = crypto.createHmac("sha256", deps.secret).update(deps.body).digest("hex");
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(deps.signature));
    } catch {
        return false;
    }
}

/**
 * Audit H8: webhook secret rotation overlap. During a rotation window,
 * Razorpay may sign events with EITHER the old or the new secret. Pass
 * both into `verifyRazorpayWebhookAny` to accept both signatures.
 *
 *   1. Admin updates Razorpay webhook secret in the dashboard.
 *   2. Old secret is automatically retained as the `previous`
 *      (read-only); both verify webhook calls succeed for the
 *      duration of the rotation window.
 *   3. After the window (typically a few hours once Razorpay has
 *      propagated the new secret to all signing nodes), the previous
 *      is cleared.
 *
 * Today this function expects both secrets to be supplied; the
 * orchestrator (webhook route) reads them via `getRazorpayWebhookSecrets`
 * and passes the candidates in. Use `verifyRazorpayWebhook` directly
 * if you don't need the rotation window.
 */
export function verifyRazorpayWebhookAny(
    body: string,
    signature: string,
    secrets: ReadonlyArray<string>,
): boolean {
    if (secrets.length === 0) {
        return false;
    }
    for (const s of secrets) {
        if (!s) continue;
        const expected = crypto.createHmac("sha256", s).update(body).digest("hex");
        try {
            if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
                return true;
            }
        } catch {
            // length mismatch on timingSafeEqual — try next candidate
        }
    }
    return false;
}

/**
 * Return the list of active Razorpay webhook secrets (current +
 * optional previous). The previous slot comes from the env var
 * `RAZORPAY_WEBHOOK_SECRET_PREVIOUS` — a manual escape hatch for
 * rotation. The Settings DB only stores the current value (admin
 * rotations update it in place).
 */
export async function getRazorpayWebhookSecrets(): Promise<string[]> {
    const current = await getSetting("razorpay_webhook_secret");
    const previous = process.env["RAZORPAY_WEBHOOK_SECRET_PREVIOUS"];
    const out: string[] = [];
    if (current) out.push(current);
    if (previous) out.push(previous);
    return out;
}
