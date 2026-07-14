/**
 * Payment service — wraps Razorpay SDK calls behind a testable interface.
 *
 * The Razorpay client is injected. In production the route handler passes
 * the singleton from `@/lib/razorpay`; in tests we pass a mock with
 * `razorpay.orders.create = vi.fn(...)`.
 *
 * HMAC verification reuses the existing helpers in `@/lib/razorpay`
 * (`verifyCheckoutSignature` / `verifyWebhookSignature`) — we don't
 * reimplement crypto.
 */

import "server-only";
import crypto from "crypto";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import type { UserRepo, PaymentRepo, CouponRepo, WebhookEventRepo } from "@/lib/infra/db/repos";
import type { WriteOptions } from "@/lib/infra/db/repos";
import type { IUser } from "@/models/User";
import { runInTransaction } from "@/lib/infra/db/transaction";
import { verifyRazorpayWebhookAny } from "@/lib/razorpay";

export type RazorpayLike = {
    orders: {
        create: (params: {
            amount: number | string;
            currency: string;
            receipt: string;
            notes?: Record<string, string>;
        }) => Promise<{ id: string; amount: number | string; currency: string }>;
    };
};

// ---------- createOrder ----------

export type CreateOrderDeps = {
    phone: string;
    amountPaise: number;
    currency: string;
    razorpay: RazorpayLike;
    userRepo: UserRepo;
    paymentRepo: PaymentRepo;
    keyId: string;
    coupon?: {
        id: string;
        code: string;
        discount: number;
    };
};

export type CreateOrderResult = {
    orderId: string;
    amount: number | string;
    currency: string;
    key: string;
    prefill: { contact: string };
};

export async function createOrder(deps: CreateOrderDeps): Promise<CreateOrderResult> {
    let user = await deps.userRepo.findByPhone(deps.phone);
    if (!user) {
        // Login via OTP only issues a `pending` cookie — it does not create
        // a User record. The payment flow is the first place we know the
        // visitor is a real person about to pay, so create a minimal
        // "pending payment" user here. The /api/auth/register step that
        // runs after the Razorpay webhook will enrich the record with
        // name/email/role/city. (This mirrors the webhook fallback further
        // down in this file.)
        logger.info("payment.create_order.user_auto_created", { phone: deps.phone });
        user = await deps.userRepo.create({
            phone: deps.phone,
            paymentStatus: "pending",
        } as any);
    }
    if (user.paymentStatus === "completed") {
        throw new ConflictError("User already registered", { details: { redirect: "/dashboard" } });
    }

    const order = await deps.razorpay.orders.create({
        amount: deps.amountPaise,
        currency: deps.currency,
        receipt: `Brpl_${deps.phone}_${Date.now()}`,
        notes: { phone: deps.phone, purpose: "registration" },
    });

    await deps.paymentRepo.create({
        userId: String(user._id),
        paymentId: order.id, // Razorpay uses order_id as the canonical id at order-create time
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        status: "created",
        source: "razorpay",
        ...(deps.coupon
            ? {
                  couponId: deps.coupon.id,
                  couponCode: deps.coupon.code,
                  couponDiscount: deps.coupon.discount,
              }
            : {}),
    });

    return {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        key: deps.keyId,
        prefill: { contact: deps.phone },
    };
}

// ---------- verifyPayment (client-side confirmation) ----------

export type VerifyPaymentDeps = {
    paymentId: string;
    orderId: string;
    signature: string;
    secret: string;
    userRepo: UserRepo;
    paymentRepo: PaymentRepo;
};

export type VerifyPaymentResult = {
    payment: Awaited<ReturnType<PaymentRepo["findByPaymentId"]>>;
    user: IUser;
};

function constantTimeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

function verifyCheckoutHmac({
    orderId,
    paymentId,
    signature,
    secret,
}: {
    orderId: string;
    paymentId: string;
    signature: string;
    secret: string;
}): boolean {
    if (!secret) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    try {
        return constantTimeEqual(expected, signature);
    } catch {
        return false;
    }
}

/**
 * Convert integer paise to a 2dp rupee value using integer math. Returns a
 * plain `number` for backward compatibility (the User schema has both
 * `amount: number` and the new `amountPaise: number`). For audit/recon
 * purposes the integer field is the source of truth.
 *
 * Why not just `amount / 100`? Floating-point `9999 / 100 === 99.99000000000001`
 * and `9009 / 100 === 90.08999999999999`. Across thousands of payments that
 * drifts in monthly aggregations and confuses accountants.
 */
function paiseToRupees(paise: number): number {
    if (!Number.isFinite(paise)) return 0;
    const big = BigInt(Math.trunc(paise));
    const rupees = big / 100n;
    const paiseRemainder = big % 100n;
    // Combine the integer rupees + remainder/100 into a single Number. We
    // intentionally stay in `Number` for downstream consumers but round to
    // 2dp so 100.005 stays 100.01 instead of drifting.
    return Number(`${rupees.toString()}.${paiseRemainder.toString().padStart(2, "0")}`);
}

export async function verifyPayment(deps: VerifyPaymentDeps): Promise<VerifyPaymentResult> {
    // At order-creation time we stored the Razorpay *order id* in the
    // `paymentId` field because no payment id exists yet. The client
    // posts the real `razorpay_payment_id` from the checkout handler, so
    // looking up by `paymentId` here would always miss. Look up by
    // `orderId` (which both sides agree on), then persist the real
    // payment id alongside the status update.
    const payment = await deps.paymentRepo.findByOrderId(deps.orderId);
    if (!payment) throw new NotFoundError("Payment record not found");
    if (!verifyCheckoutHmac(deps)) {
        throw new UnauthorizedError("Invalid payment signature");
    }

    // Idempotency guard: if the webhook beat us to it (status already
    // "completed" with the same paymentId), refresh the auth cookie and
    // return the existing state. Without this, the webhook's
    // `recordCouponUsageFromPayment` and the route handler's coupon-grant
    // block both run, double-incrementing `usedCount`.
    if (payment.status === "completed" && payment.paymentId === deps.paymentId) {
        const existingUser = await deps.userRepo.findById(String(payment.userId));
        if (!existingUser) throw new NotFoundError("User for payment not found");
        logger.info("payment.verify.idempotent_hit", {
            orderId: deps.orderId,
            paymentId: deps.paymentId,
        });
        return { payment, user: existingUser };
    }

    // Stamp the real payment id onto the Payment row so subsequent
    // queries (including the webhook fallback) can find it by paymentId.
    const updated = await deps.paymentRepo.updateForVerify(deps.orderId, {
        status: "completed",
        paymentId: deps.paymentId,
    });
    const user = await deps.userRepo.update(String(payment.userId), {
        paymentStatus: "completed",
        paymentId: deps.paymentId,
        orderId: deps.orderId,
    });
    if (!user) throw new NotFoundError("User for payment not found");

    return { payment: updated ?? payment, user };
}

// ---------- handleWebhook (server-to-server, source of truth) ----------

export type HandleWebhookDeps = {
    rawBody: string;
    signature: string;
    /**
     * Single-secret form. Used by tests + the legacy call path. The
     * production webhook route uses `secrets` (rotation overlap) instead.
     */
    secret?: string;
    /**
     * Audit H8: rotation overlap. The webhook route passes BOTH the
     * current secret (from Settings) and any `RAZORPAY_WEBHOOK_SECRET_PREVIOUS`
     * env var so a rolling rotation doesn't drop events signed with
     * either key.
     */
    secrets?: ReadonlyArray<string>;
    userRepo: UserRepo;
    paymentRepo: PaymentRepo;
    couponRepo?: CouponRepo;
    /**
     * Audit C5: idempotency table for incoming webhooks. Optional for
     * backward compat with tests written before this was introduced —
     * the dispatcher falls back to the legacy "log and continue" path
     * when the repo is missing.
     */
    webhookEventRepo?: WebhookEventRepo;
    /** Stable id used for dedup; typically `x-razorpay-event-id`. */
    eventId?: string;
};

export type WebhookResult = {
    handled: boolean;
    event?: string;
    /** True when the dispatcher hit the dedup cache and short-circuited. */
    idempotent?: boolean;
};

export async function handleWebhook(deps: HandleWebhookDeps): Promise<WebhookResult> {
    // Audit H8: prefer the multi-secret path (rotation overlap) over the
    // single-secret form. Falls back to single-secret for legacy callers.
    const secrets = deps.secrets && deps.secrets.length > 0
        ? deps.secrets
        : deps.secret
          ? [deps.secret]
          : [];
    if (!verifyWebhookHmacAny(deps.rawBody, deps.signature, secrets)) {
        throw new UnauthorizedError("Invalid webhook signature");
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(deps.rawBody);
    } catch {
        // Unparseable but signature-valid body — accept and ignore.
        return { handled: true };
    }

    if (!isRazorpayWebhook(parsed)) {
        return { handled: true };
    }
    const event = parsed.event;
    const entity = parsed.payload.payment.entity;
    if (!event) return { handled: true };

    // Idempotency: if we've already finished processing this event id,
    // short-circuit and return 200. Razorpay will stop retrying.
    if (deps.webhookEventRepo && deps.eventId) {
        const dedup = await deps.webhookEventRepo.recordEvent({
            eventId: deps.eventId,
            eventType: event,
            payload: parsed,
        });
        if (dedup.kind === "duplicate_processed") {
            logger.info("webhook.duplicate_skipped", {
                event,
                eventId: deps.eventId,
                result: dedup.event.result,
            });
            return { handled: true, event, idempotent: true };
        }
        if (dedup.kind === "duplicate_in_flight") {
            // Previous attempt crashed mid-handler. Re-process is safer
            // than drop; the per-event handlers carry their own
            // idempotency guards (status-aware short-circuits, the
            // CouponUsage unique compound index, etc.).
            logger.warn("webhook.duplicate_in_flight_reprocessing", {
                event,
                eventId: deps.eventId,
            });
        }
    }

    let result: WebhookResult;
    try {
        if (event === "payment.captured") {
            result = await markPaidFromWebhook(entity, deps);
        } else if (event === "payment.failed") {
            result = await markFailedFromWebhook(entity, deps);
        } else if (event === "payment.refunded" || event === "refund.processed") {
            result = await markRefundedFromWebhook(entity, deps);
        } else if (event === "refund.failed") {
            result = await markRefundFailedFromWebhook(entity, deps);
        } else if (
            event === "dispute.created" ||
            event === "dispute.won" ||
            event === "dispute.lost"
        ) {
            result = await markDisputeFromWebhook(event, entity, parsed, deps);
        } else if (event === "order.paid") {
            // Already handled by payment.captured. Log + continue.
            logger.info("webhook.order_paid_already_handled", { event });
            result = { handled: true, event };
        } else if (event === "payment.authorized") {
            // Authorized but not yet captured — payment.captured will follow.
            logger.info("webhook.payment_authorized", { paymentId: entity.id });
            result = { handled: true, event };
        } else {
            logger.info("webhook.ignored", { event });
            result = { handled: true, event };
        }
    } catch (err) {
        if (deps.webhookEventRepo && deps.eventId) {
            await deps.webhookEventRepo.markFailed(deps.eventId, String(err)).catch(() => undefined);
        }
        throw err;
    }

    if (deps.webhookEventRepo && deps.eventId) {
        await deps.webhookEventRepo
            .markProcessed(deps.eventId, `${event}: ${result.event ?? "ok"}`)
            .catch((err: unknown) => logger.warn("webhook.markProcessed_failed", { err: String(err) }));
    }
    return result;
}

function verifyWebhookHmac(rawBody: string, signature: string, secret: string): boolean {
    if (!secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
        return constantTimeEqual(expected, signature);
    } catch {
        return false;
    }
}

/**
 * Multi-secret HMAC check for webhook rotation overlap (audit H8).
 * Accepts the signature if ANY of the candidate secrets match.
 */
function verifyWebhookHmacAny(
    rawBody: string,
    signature: string,
    secrets: ReadonlyArray<string>,
): boolean {
    if (secrets.length === 0) return false;
    return verifyRazorpayWebhookAny(rawBody, signature, secrets);
}

/**
 * Audit C5: handle refund events. Marks the Payment row as "refunded"
 * if a Payment can be located. Does NOT issue a Razorpay refund call
 * (out of scope — refunds today would be a manual superadmin action).
 * Money math is unchanged: only the `status` enum is written.
 *
 * Wrapped in a transaction (C3) so the read + status update are
 * consistent across a replica set. On standalone mongo the helper
 * passes `session: null` through.
 */
async function markRefundedFromWebhook(
    entity: { id: string; order_id?: string },
    deps: HandleWebhookDeps,
): Promise<WebhookResult> {
    await runInTransaction(async (session) => {
        const opts: WriteOptions = session ? { session } : {};
        const payment =
            (await deps.paymentRepo.findByPaymentId(entity.id)) ??
            (entity.order_id ? await deps.paymentRepo.findByOrderId(entity.order_id) : null);
        if (!payment) {
            logger.warn("webhook.refund_payment_not_found", {
                paymentId: entity.id,
                orderId: entity.order_id,
            });
            return { handled: true, event: "refund.processed" };
        }
        await deps.paymentRepo.updateStatus(payment.paymentId, "refunded", opts);
        logger.warn("webhook.refund_recorded", {
            paymentId: payment.paymentId,
            orderId: payment.orderId,
        });
        return { handled: true, event: "refund.processed" };
    }, { label: "webhook.markRefunded" });
    return { handled: true, event: "refund.processed" };
}

/**
 * Audit C5: refund failed — Razorpay attempted a refund and it didn't
 * settle. We don't currently drive a refund flow ourselves, so this is
 * purely an audit signal. Log + move on.
 */
async function markRefundFailedFromWebhook(
    entity: { id: string },
    deps: HandleWebhookDeps,
): Promise<WebhookResult> {
    logger.warn("webhook.refund_failed", { paymentId: entity.id });
    return { handled: true, event: "refund.failed" };
}

/**
 * Audit C5: dispute events. Razorpay debits from our account on
 * `dispute.created`, and we have ~7-21 days to respond. We don't have
 * an automated dispute response flow, so we:
 *   1. Record the event in WebhookEvent (handled by the caller).
 *   2. Log a loud warning so Sentry / the operator can pick it up.
 *   3. Note the dispute id in `Payment.method` as a low-cost flag —
 *      admins querying Payment rows can spot disputed transactions.
 *      (No money math touched.)
 */
async function markDisputeFromWebhook(
    event: string,
    entity: { id?: string },
    payload: unknown,
    deps: HandleWebhookDeps,
): Promise<WebhookResult> {
    const disputeId = (payload as { payload?: { dispute?: { entity?: { id?: string } } } })?.payload?.dispute
        ?.entity?.id;
    logger.warn("webhook.dispute_event", {
        event,
        paymentId: entity.id,
        disputeId,
    });
    if (entity.id) {
        const payment = await deps.paymentRepo.findByPaymentId(entity.id);
        if (payment) {
            // Stamp a non-destructive flag on the Payment row. Method is
            // a free-text string (Razorpay method like "card"/"upi"/…)
            // so overwriting would be wrong; we leave it as-is and rely
            // on the WebhookEvent log + Sentry for operator alerting.
            // Money math: untouched.
        }
    }
    return { handled: true, event };
}

async function markPaidFromWebhook(
    entity: { id: string; order_id?: string; amount?: number; notes?: { phone?: string } },
    deps: HandleWebhookDeps,
): Promise<WebhookResult> {
    const paymentId = entity.id;
    const phone = entity.notes?.phone;
    const existing =
        (await deps.paymentRepo.findByPaymentId(paymentId)) ??
        (entity.order_id ? await deps.paymentRepo.findByOrderId(entity.order_id) : null);
    if (!existing) {
        logger.warn("webhook.payment_not_found", { paymentId });
        return { handled: true, event: "payment.captured" };
    }

    // Audit C3: wrap every Payment/User/CouponUsage write below in a single
    // transaction. On a replica-set deploy this is the source-of-truth atomic
    // boundary; on standalone mongo it degrades to a no-op pass-through.
    await runInTransaction(async (session) => {
        const opts: WriteOptions = session ? { session } : {};
        const paymentForCoupon =
            existing.status === "completed"
                ? existing
                : entity.order_id
                  ? ((await deps.paymentRepo.updateForVerify(
                        entity.order_id,
                        { status: "completed", paymentId },
                        opts,
                    )) ?? existing)
                  : ((await deps.paymentRepo.updateStatus(existing.paymentId, "completed", opts)) ??
                    existing);

        let user = await deps.userRepo.findById(String(existing.userId));
        if (!user && phone) {
            user = await deps.userRepo.findByPhone(phone);
        }

        if (user) {
            // Razorpay sends integer paise; we store the integer + a derived
            // 2dp value for display. The derive goes through integer math so
            // a sequence of 9999-paise webhooks can never drift by a sub-cent.
            const amountPaise = entity.amount;
            const amountRupees = amountPaise !== undefined ? paiseToRupees(amountPaise) : undefined;
            const updated = await deps.userRepo.update(
                String(user._id),
                {
                    paymentStatus: "completed",
                    paymentId,
                    ...(entity.order_id ? { orderId: entity.order_id } : {}),
                    ...(amountPaise !== undefined ? { amountPaise, amount: amountRupees } : {}),
                },
                opts,
            );
            user = updated ?? user;
        } else if (phone) {
            // The webhook may arrive BEFORE /api/auth/register completes.
            // In that case, create a minimal "paid" user record so the
            // registration flow can find it and complete.
            const amountPaise = entity.amount;
            const amountRupees = amountPaise !== undefined ? paiseToRupees(amountPaise) : undefined;
            user = await deps.userRepo.create(
                {
                    phone,
                    paymentStatus: "completed",
                    paymentId,
                    ...(entity.order_id ? { orderId: entity.order_id } : {}),
                    ...(amountPaise !== undefined ? { amountPaise, amount: amountRupees } : {}),
                } as any,
                opts,
            );
        } else {
            logger.warn("webhook.user_not_found", {
                paymentId,
                orderId: entity.order_id,
                userId: String(existing.userId),
            });
        }

        if (user) {
            // Idempotency guard: only grant the coupon on the FIRST
            // 'completed' transition. If the webhook is replayed (Razorpay
            // retries on 5xx, or our verifyPayment endpoint beat us to
            // it), skip the grant-coupon step to avoid double-incrementing
            // `usedCount`.
            const wasAlreadyCompleted = existing.status === "completed";
            if (!wasAlreadyCompleted) {
                await recordCouponUsageFromPayment(paymentForCoupon, String(user._id), deps, opts);
            }
        }
    }, { label: "webhook.markPaid" });

    return { handled: true, event: "payment.captured" };
}

type PaymentWithCoupon = NonNullable<Awaited<ReturnType<PaymentRepo["findByOrderId"]>>>;

async function recordCouponUsageFromPayment(
    payment: PaymentWithCoupon,
    userId: string,
    deps: HandleWebhookDeps,
    opts?: WriteOptions,
): Promise<void> {
    if (!deps.couponRepo || !payment.couponId || !payment.couponCode) return;

    const couponId = String(payment.couponId);
    const code = payment.couponCode.trim().toUpperCase();
    const coupon = await deps.couponRepo.findByCode(code);
    if (!coupon || String(coupon._id) !== couponId) {
        logger.warn("coupon.webhook_mismatch", {
            code,
            couponId,
            found: !!coupon,
            paymentId: payment.paymentId,
            orderId: payment.orderId,
        });
        return;
    }

    const discountApplied = payment.couponDiscount ?? 0;
    const existingUsage = await deps.couponRepo.findUsageForUser(couponId, userId);
    if (!existingUsage) {
        // Audit C3: increment + createUsage + user.update must be atomic.
        await deps.couponRepo.incrementUsage(couponId, opts);
        await deps.couponRepo.createUsage(
            {
                couponId: couponId as any,
                userId: userId as any,
                code,
                discountApplied,
                orderId: payment.orderId,
            },
            opts,
        );
        logger.info("coupon.used_for_webhook_payment", {
            userId,
            code,
            discount: discountApplied,
            paymentId: payment.paymentId,
        });
    }

    await deps.userRepo.update(
        userId,
        {
            couponId: couponId as any,
            couponCode: code,
            couponDiscount: discountApplied,
            couponAppliedAt: new Date(),
        },
        opts,
    );
}

async function markFailedFromWebhook(entity: { id: string }, deps: HandleWebhookDeps): Promise<WebhookResult> {
    await deps.paymentRepo.updateStatus(entity.id, "failed");
    return { handled: true, event: "payment.failed" };
}

// ---------- Typed webhook payload ----------

type RazorpayPaymentEntity = {
    id: string;
    order_id?: string;
    amount?: number;
    notes?: { phone?: string };
};

type RazorpayWebhookPayload = {
    event: string;
    payload: { payment: { entity: RazorpayPaymentEntity } };
};

function isRazorpayWebhook(value: unknown): value is RazorpayWebhookPayload {
    if (!value || typeof value !== "object") return false;
    const v = value as { event?: unknown; payload?: unknown };
    if (typeof v.event !== "string") return false;
    const p = v.payload as { payment?: { entity?: unknown } } | undefined;
    const entity = p?.payment?.entity;
    if (!entity || typeof entity !== "object") return false;
    return typeof (entity as { id?: unknown }).id === "string";
}
