/**
 * `WebhookEvent` — idempotency table for incoming Razorpay webhooks.
 *
 * Background (audit C5): Razorpay retries any webhook we don't 200 within
 * a few seconds. If our handler is non-idempotent (e.g. the verify vs
 * webhook race that double-grants coupon usage), retries can cause
 * duplicate fulfillment.
 *
 * Strategy:
 *   1. On every webhook, look up by `eventId` (the Razorpay
 *      `x-razorpay-event-id` header). If we've seen it AND finished
 *      processing → return 200 immediately. Razorpay stops retrying.
 *   2. If we've seen it but `processed: false` (we crashed mid-handler)
 *      → log a warning, but still return 200 (re-processing a half-done
 *      event is worse than skipping one).
 *   3. If new → record the event with `processed: false`, dispatch, then
 *      mark `processed: true` with a summary of what was done.
 *
 * Why a separate collection rather than another field on Payment? A real
 * replay can fire a *different* event type for the same order (e.g.
 * `payment.captured` followed by `payment.refunded`), and the event-id
 * is the only stable dedup key across event types.
 *
 * Money-math safety (audit C8 / scope): this model never touches
 * amounts. Status transitions for `payment.refunded` go through
 * `PaymentRepo.updateStatus`, which writes the `status` enum only —
 * no amount math changes.
 */

import mongoose, { Schema, Model, Document } from "mongoose";

export interface IWebhookEvent extends Document {
    _id: mongoose.Types.ObjectId;
    /** Razorpay's `x-razorpay-event-id` header value (or a hash of the
     *  raw body if the header is missing). UNIQUE. */
    eventId: string;
    /** Razorpay event name, e.g. "payment.captured", "refund.processed". */
    eventType: string;
    /** Free-form JSON of the webhook payload (stored as Mixed for
     *  audit/inspection). NOT used to drive business logic. */
    payload: unknown;
    /** True once the dispatcher has run to completion. */
    processed: boolean;
    /** Short human-readable summary written by the dispatcher, e.g.
     *  "marked paid", "marked refunded", "ignored". */
    result?: string;
    /** Optional error string if processing threw but we caught it. */
    error?: string;
    receivedAt: Date;
    processedAt?: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
    {
        eventId: { type: String, required: true, unique: true, index: true },
        eventType: { type: String, required: true, index: true },
        payload: { type: Schema.Types.Mixed },
        processed: { type: Boolean, required: true, default: false, index: true },
        result: { type: String },
        error: { type: String },
        receivedAt: { type: Date, required: true, default: () => new Date() },
        processedAt: { type: Date },
    },
    { timestamps: true },
);

const WebhookEvent: Model<IWebhookEvent> =
    (mongoose.models.WebhookEvent as Model<IWebhookEvent>) ||
    mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);

export default WebhookEvent;