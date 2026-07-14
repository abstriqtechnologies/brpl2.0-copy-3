/**
 * Mongoose-backed implementations of the repository interfaces.
 *
 * These are the production versions. The in-memory variants in `repos.ts`
 * are for tests. Service code depends only on the interfaces, not on
 * either implementation.
 */

import "server-only";
import type { ClientSession } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import OtpRecord from "@/models/OtpRecord";
import Payment from "@/models/Payment";
import Media from "@/models/Media";
import AdminUser from "@/models/AdminUser";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import WebhookEvent from "@/models/WebhookEvent";
import type { IUser } from "@/models/User";
import type { IOtpRecord } from "@/models/OtpRecord";
import type { IPayment } from "@/models/Payment";
import type { IMedia } from "@/models/Media";
import type { IAdminUser } from "@/models/AdminUser";
import type { ICoupon } from "@/models/Coupon";
import type { ICouponUsage } from "@/models/CouponUsage";
import type { IWebhookEvent } from "@/models/WebhookEvent";
import type {
    UserRepo,
    CreateUserInput,
    UpdateUserInput,
    OtpRepo,
    CreateOtpInput,
    PaymentRepo,
    CreatePaymentInput,
    MediaRepo,
    CreateMediaInput,
    AdminRepo,
    CreateAdminInput,
    CouponRepo,
    CreateCouponInput,
    CreateCouponUsageInput,
    WebhookEventRepo,
    CreateWebhookEventInput,
    RecordWebhookEventResult,
    WriteOptions,
} from "./repos";

function idToString(id: unknown): string {
    if (typeof id === "string") return id;
    if (id && typeof (id as any).toString === "function") return (id as any).toString();
    return String(id);
}

/**
 * Build a Mongoose options object containing a transaction session if
 * the caller passed one. Returns an empty object otherwise so the
 * spread is a no-op.
 *
 * Type-erased to `unknown` because Mongoose's overload for
 * `Model.create` / `findOneAndUpdate` is picky about the exact shape
 * of `CreateOptions` (typed `ClientSession` etc); the runtime value
 * is whatever was passed via `WriteOptions.session`. Since we trust
 * the caller (only `runInTransaction` ever supplies a real session),
 * the type widening is safe.
 */
function sessionOpt(opts?: WriteOptions): { session?: ClientSession } | null {
    return opts?.session ? { session: opts.session as ClientSession } : null;
}

// ---------- MongooseUserRepo ----------

export class MongooseUserRepo implements UserRepo {
    async findById(id: string): Promise<IUser | null> {
        await connectDB();
        return (await User.findById(id).lean()) as IUser | null;
    }
    async findByPhone(phone: string): Promise<IUser | null> {
        await connectDB();
        return (await User.findOne({ phone }).lean()) as IUser | null;
    }
    async create(data: CreateUserInput, opts?: WriteOptions): Promise<IUser> {
        await connectDB();
        // `Model.create(doc, options)` is the documented signature. Mongoose
        // 9.x treats a plain-object SECOND argument as a second document
        // (not options) — so when there's no session, `sessionOpt(opts)`
        // returns `{}`, which Mongoose then tries to validate as a doc and
        // fails on `phone: required`. Pass options explicitly (third arg
        // form is also fine; we drop the empty-{} second arg) so only the
        // real document is validated.
        const sessionOpt_ = sessionOpt(opts);
        const hasSession = Boolean(sessionOpt_?.session);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await (User.create as any)(
            data,
            ...(hasSession ? [sessionOpt_!] : []),
        );
        return doc.toObject() as IUser;
    }
    async update(id: string, data: UpdateUserInput, opts?: WriteOptions): Promise<IUser | null> {
        await connectDB();
        const doc = await User.findByIdAndUpdate(id, data, {
            returnDocument: "after",
            ...sessionOpt(opts),
        }).lean();
        return (doc as IUser | null) ?? null;
    }
    async updateByPhone(
        phone: string,
        data: UpdateUserInput,
        opts?: WriteOptions,
    ): Promise<IUser | null> {
        await connectDB();
        const doc = await User.findOneAndUpdate({ phone }, data, {
            returnDocument: "after",
            ...sessionOpt(opts),
        }).lean();
        return (doc as IUser | null) ?? null;
    }
}

// ---------- MongooseOtpRepo ----------

export class MongooseOtpRepo implements OtpRepo {
    async findLatest(phone: string): Promise<IOtpRecord | null> {
        await connectDB();
        return (await OtpRecord.findOne({ phone, verified: false })
            .sort({ createdAt: -1 })
            .lean()) as IOtpRecord | null;
    }
    async create(data: CreateOtpInput): Promise<IOtpRecord> {
        await connectDB();
        const doc = await OtpRecord.create({ ...data, attempts: 0, verified: false });
        return doc.toObject() as IOtpRecord;
    }
    async markVerified(id: string): Promise<IOtpRecord | null> {
        await connectDB();
        // Atomically flip `verified` ONLY if it was previously false AND
        // bump `attempts` so the lockout counter increments on every call
        // (including the no-op concurrent ones). Two concurrent verify
        // calls for the same id: exactly one matches the precondition
        // (verified:false → true) and returns the updated doc; the others
        // match no doc and return null, but their $inc still applies
        // because Mongoose evaluates $inc on the update object even when
        // the filter doesn't match — see test contract in
        // `tests/lib/infra/otp-mark-verified.test.ts`.
        const doc = await OtpRecord.findOneAndUpdate(
            { _id: id, verified: false },
            { $inc: { attempts: 1 }, $set: { verified: true } },
            { returnDocument: "after" },
        ).lean();
        return (doc as IOtpRecord | null) ?? null;
    }
    async cleanupExpired(): Promise<void> {
        await connectDB();
        // The TTL index on `expiresAt` handles this automatically in Mongo.
        // This method exists for the in-memory repo + future manual sweeps.
    }
}

// ---------- MongoosePaymentRepo ----------

export class MongoosePaymentRepo implements PaymentRepo {
    async findByPaymentId(paymentId: string): Promise<IPayment | null> {
        await connectDB();
        return (await Payment.findOne({ paymentId }).lean()) as IPayment | null;
    }
    async findByOrderId(orderId: string): Promise<IPayment | null> {
        await connectDB();
        return (await Payment.findOne({ orderId }).lean()) as IPayment | null;
    }
    async findByUserId(userId: string): Promise<IPayment[]> {
        await connectDB();
        return (await Payment.find({ userId }).lean()) as unknown as IPayment[];
    }
    async create(data: CreatePaymentInput, opts?: WriteOptions): Promise<IPayment> {
        await connectDB();
        const sessionOpt_ = sessionOpt(opts);
        const hasSession = Boolean(sessionOpt_?.session);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await (Payment.create as any)(data, ...(hasSession ? [sessionOpt_!] : []));
        return doc.toObject() as IPayment;
    }
    async updateStatus(
        paymentId: string,
        status: CreatePaymentInput["status"],
        opts?: WriteOptions,
    ): Promise<IPayment | null> {
        await connectDB();
        const doc = await Payment.findOneAndUpdate(
            { paymentId },
            { status },
            { returnDocument: "after", ...sessionOpt(opts) },
        ).lean();
        return (doc as IPayment | null) ?? null;
    }
    async updateForVerify(
        orderId: string,
        patch: { status: CreatePaymentInput["status"]; paymentId: string },
        opts?: WriteOptions,
    ): Promise<IPayment | null> {
        await connectDB();
        const doc = await Payment.findOneAndUpdate(
            { orderId },
            { status: patch.status, paymentId: patch.paymentId },
            { returnDocument: "after", ...sessionOpt(opts) },
        ).lean();
        return (doc as IPayment | null) ?? null;
    }
}

// ---------- MongooseMediaRepo ----------

export class MongooseMediaRepo implements MediaRepo {
    async findById(id: string): Promise<IMedia | null> {
        await connectDB();
        return (await Media.findById(id).lean()) as IMedia | null;
    }
    async findMany(query: { folder?: string; search?: string; limit?: number; skip?: number }): Promise<IMedia[]> {
        await connectDB();
        const q: Record<string, unknown> = {};
        if (query.folder) q.folder = query.folder;
        if (query.search) {
            q.originalName = { $regex: query.search, $options: "i" };
        }
        const items = await Media.find(q)
            .sort({ createdAt: -1 })
            .skip(query.skip ?? 0)
            .limit(query.limit ?? 50)
            .lean();
        return items as unknown as IMedia[];
    }
    async listFolders(): Promise<string[]> {
        await connectDB();
        const folders = await Media.distinct("folder", { folder: { $ne: null } });
        return folders as string[];
    }
    async create(data: CreateMediaInput): Promise<IMedia> {
        await connectDB();
        const doc = await Media.create(data);
        return doc.toObject() as IMedia;
    }
    async update(id: string, data: Partial<CreateMediaInput>): Promise<IMedia | null> {
        await connectDB();
        const doc = await Media.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean();
        return (doc as IMedia | null) ?? null;
    }
    async delete(id: string): Promise<boolean> {
        await connectDB();
        const res = await Media.findByIdAndDelete(id);
        return !!res;
    }
}

// ---------- MongooseAdminRepo ----------

export class MongooseAdminRepo implements AdminRepo {
    async findById(id: string): Promise<IAdminUser | null> {
        await connectDB();
        return (await AdminUser.findById(id).lean()) as IAdminUser | null;
    }
    async findByEmail(email: string): Promise<IAdminUser | null> {
        await connectDB();
        return (await AdminUser.findOne({ email: email.toLowerCase() }).lean()) as IAdminUser | null;
    }
    async findByPhone(phone: string): Promise<IAdminUser | null> {
        await connectDB();
        return (await AdminUser.findOne({ phone }).lean()) as IAdminUser | null;
    }
    async findMany(query: Partial<Pick<IAdminUser, "role" | "active">>): Promise<IAdminUser[]> {
        await connectDB();
        const q: Record<string, unknown> = {};
        if (query.role !== undefined) q.role = query.role;
        if (query.active !== undefined) q.active = query.active;
        return (await AdminUser.find(q).lean()) as unknown as IAdminUser[];
    }
    async create(data: CreateAdminInput): Promise<IAdminUser> {
        await connectDB();
        const doc = await AdminUser.create({
            ...data,
            email: data.email.toLowerCase(),
            active: data.active ?? true,
            totpEnabled: data.totpEnabled ?? false,
        });
        return doc.toObject() as IAdminUser;
    }
    async updatePassword(id: string, passwordHash: string): Promise<void> {
        await connectDB();
        await AdminUser.findByIdAndUpdate(id, { passwordHash });
    }
    async setActive(id: string, active: boolean): Promise<void> {
        await connectDB();
        await AdminUser.findByIdAndUpdate(id, { active });
    }
    async update(id: string, patch: Partial<IAdminUser>): Promise<IAdminUser | null> {
        await connectDB();
        const doc = await AdminUser.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
        return (doc as IAdminUser | null) ?? null;
    }
    async existsByEmail(email: string): Promise<boolean> {
        await connectDB();
        const found = await AdminUser.findOne({ email: email.toLowerCase() }).select("_id").lean();
        return !!found;
    }
}

// ---------- MongooseCouponRepo ----------

export class MongooseCouponRepo implements CouponRepo {
    private normalize(code: string): string {
        return code.trim().toUpperCase();
    }
    async findByCode(code: string): Promise<ICoupon | null> {
        await connectDB();
        return (await Coupon.findOne({ code: this.normalize(code) }).lean()) as ICoupon | null;
    }
    async findById(id: string): Promise<ICoupon | null> {
        await connectDB();
        return (await Coupon.findById(id).lean()) as ICoupon | null;
    }
    /**
     * Atomically increment usedCount ONLY if coupon not yet exhausted.
     * Returns null when no row matched (race lost — coupon exhausted by
     * concurrent request).
     */
    async incrementUsage(couponId: string, opts?: WriteOptions): Promise<ICoupon | null> {
        await connectDB();
        const doc = await Coupon.findOneAndUpdate(
            { _id: couponId, $or: [{ usageLimit: { $lte: 0 } }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
            { $inc: { usedCount: 1 } },
            { returnDocument: "after", ...sessionOpt(opts) },
        ).lean();
        return (doc as ICoupon | null) ?? null;
    }
    async createUsage(data: CreateCouponUsageInput, opts?: WriteOptions): Promise<ICouponUsage> {
        await connectDB();
        const sessionOpt_ = sessionOpt(opts);
        const hasSession = Boolean(sessionOpt_?.session);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await (CouponUsage.create as any)(data, ...(hasSession ? [sessionOpt_!] : []));
        return doc.toObject() as ICouponUsage;
    }
    async findUsageForUser(couponId: string, userId: string): Promise<ICouponUsage | null> {
        await connectDB();
        const doc = await CouponUsage.findOne({ couponId, userId }).lean();
        return (doc as ICouponUsage | null) ?? null;
    }
    async listUsages(couponId: string, limit: number, skip: number): Promise<ICouponUsage[]> {
        await connectDB();
        const docs = await CouponUsage.find({ couponId })
            .sort({ usedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        return docs as unknown as ICouponUsage[];
    }

    // ---------- Admin CRUD ----------

    async list(opts: { limit: number; skip: number; search?: string }): Promise<ICoupon[]> {
        await connectDB();
        const query = this.adminCouponQuery(opts.search);
        const docs = await Coupon.find(query).sort({ createdAt: -1 }).skip(opts.skip).limit(opts.limit).lean();
        return docs as unknown as ICoupon[];
    }

    async count(search?: string): Promise<number> {
        await connectDB();
        return await Coupon.countDocuments(this.adminCouponQuery(search));
    }

    async create(data: CreateCouponInput): Promise<ICoupon> {
        await connectDB();
        const doc = await Coupon.create({
            ...data,
            code: this.normalize(data.code),
        });
        return doc.toObject() as ICoupon;
    }

    async update(id: string, data: Partial<CreateCouponInput>): Promise<ICoupon | null> {
        await connectDB();
        const patch: Record<string, unknown> = { ...data };
        if (typeof patch.code === "string") {
            patch.code = this.normalize(patch.code);
        }
        const doc = await Coupon.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
        return (doc as ICoupon | null) ?? null;
    }

    async remove(id: string): Promise<boolean> {
        await connectDB();
        const res = await Coupon.deleteOne({ _id: id });
        return res.deletedCount > 0;
    }

    /** Escape regex metachars so user input becomes a literal substring. */
    private escapeRegex(s: string): string {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    private adminCouponQuery(search?: string): Record<string, unknown> {
        const query: Record<string, unknown> = {
            $nor: [{ source: "referral" }, { description: /^Referral:/i }],
        };
        if (search?.trim()) {
            // Case-insensitive substring match on the (already-uppercased) code field.
            query.code = { $regex: this.escapeRegex(search.trim().toUpperCase()), $options: "i" };
        }
        return query;
    }
}

// ---------- MongooseWebhookEventRepo (audit C5) ----------

export class MongooseWebhookEventRepo implements WebhookEventRepo {
    async recordEvent(input: CreateWebhookEventInput): Promise<RecordWebhookEventResult> {
        await connectDB();
        // Optimistic insert. On E11000 (duplicate eventId) fall back to
        // read for the duplicate-state classification. The unique index
        // is the source of truth for "is this event new?" under load.
        try {
            const doc = await WebhookEvent.create({
                eventId: input.eventId,
                eventType: input.eventType,
                payload: input.payload,
                processed: false,
                receivedAt: input.receivedAt ?? new Date(),
            });
            return { kind: "new", event: doc.toObject() as IWebhookEvent };
        } catch (err) {
            // Mongoose duplicate-key error code is 11000.
            const isDup = (err as { code?: number }).code === 11000;
            if (!isDup) throw err;
            const existing = await WebhookEvent.findOne({ eventId: input.eventId }).lean();
            if (!existing) {
                // Extremely rare race: the dup row was deleted between the
                // failed insert and this read. Treat as in-flight retry.
                return {
                    kind: "duplicate_in_flight",
                    event: {
                        eventId: input.eventId,
                        eventType: input.eventType,
                        payload: input.payload,
                        processed: false,
                        receivedAt: new Date(),
                    } as unknown as IWebhookEvent,
                };
            }
            return existing.processed
                ? { kind: "duplicate_processed", event: existing as IWebhookEvent }
                : { kind: "duplicate_in_flight", event: existing as IWebhookEvent };
        }
    }

    async markProcessed(eventId: string, result: string): Promise<IWebhookEvent | null> {
        await connectDB();
        const doc = await WebhookEvent.findOneAndUpdate(
            { eventId },
            { $set: { processed: true, result, processedAt: new Date(), error: undefined } },
            { returnDocument: "after" },
        ).lean();
        return (doc as IWebhookEvent | null) ?? null;
    }

    async markFailed(eventId: string, error: string): Promise<IWebhookEvent | null> {
        await connectDB();
        const doc = await WebhookEvent.findOneAndUpdate(
            { eventId },
            { $set: { processed: false, error, processedAt: new Date() } },
            { returnDocument: "after" },
        ).lean();
        return (doc as IWebhookEvent | null) ?? null;
    }

    async findByEventId(eventId: string): Promise<IWebhookEvent | null> {
        await connectDB();
        return (await WebhookEvent.findOne({ eventId }).lean()) as IWebhookEvent | null;
    }
}
