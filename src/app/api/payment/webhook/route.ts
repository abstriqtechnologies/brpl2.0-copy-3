/**
 * POST /api/payment/webhook
 *
 * Razorpay server-to-server webhook. This is the SOURCE OF TRUTH for
 * payment status. The `/api/payment/verify` endpoint is a defense-in-depth
 * client-side check.
 *
 * Phase 3.6b: business logic in `@/lib/domain/payment/service`. The route
 * is a thin adapter that:
 *   - reads the raw body (HMAC needs the exact bytes, not a parsed object),
 *   - reads the `x-razorpay-event-id` header (audit C5 — used as the
 *     dedup key in WebhookEvent collection),
 *   - reads the `x-razorpay-signature` header,
 *   - passes everything to `handleWebhook`.
 *
 * Audit H8: rotation overlap. `getRazorpayWebhookSecrets()` returns the
 * current + previous (env-supplied) secret; HMAC check accepts either.
 */

import { withRequest } from "@/lib/api/handlers";
import { ok } from "@/lib/api/response";
import { handleWebhook as handleWebhookService } from "@/lib/domain/payment/service";
import { getRazorpayWebhookSecrets } from "@/lib/razorpay";
import {
    MongooseUserRepo,
    MongoosePaymentRepo,
    MongooseCouponRepo,
    MongooseWebhookEventRepo,
} from "@/lib/infra/db/mongoose-repos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRequest(async ({ req }) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    // Audit C5: Razorpay sends a stable event id for dedup. Fall back
    // to a content-derived id if missing — at worst we re-process a
    // real replay (the per-event handlers carry their own idempotency).
    const headerEventId = req.headers.get("x-razorpay-event-id") || "";
    const eventId =
        headerEventId ||
        `sha256:${Buffer.from(rawBody).toString("base64").slice(0, 32)}`;

    // Audit H8: fetch current + previous secrets so a rotation doesn't
    // drop in-flight webhooks signed with the old key.
    const secrets = await getRazorpayWebhookSecrets();

    const result = await handleWebhookService({
        rawBody,
        signature,
        secrets,
        userRepo: new MongooseUserRepo(),
        paymentRepo: new MongoosePaymentRepo(),
        couponRepo: new MongooseCouponRepo(),
        webhookEventRepo: new MongooseWebhookEventRepo(),
        eventId,
    });

    return ok({ received: true, idempotent: result.idempotent === true });
});
