import mongoose, { Schema, Model, Document } from "mongoose";

export interface ICouponUsage extends Document {
    _id: mongoose.Types.ObjectId;
    couponId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    code: string;
    discountApplied: number;
    orderId?: string;
    usedAt?: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
    {
        couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        code: { type: String, required: true, index: true },
        discountApplied: { type: Number, required: true },
        orderId: { type: String },
        usedAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false }
);

// Atomic de-dup across the verify-payment / webhook race.
// Two paths can both try to grant the same coupon to the same user
// (client verifyPayment + server-to-server payment.captured webhook).
// Without this index the findUsageForUser() check-then-act pattern is
// racy; with it the second insert fails with E11000 which we map to a
// typed ConflictError ("already redeemed") — net result: one usage row,
// one incrementUsage call.
CouponUsageSchema.index({ couponId: 1, userId: 1 }, { unique: true, name: "coupon_user_unique" });

const CouponUsage: Model<ICouponUsage> =
    (mongoose.models.CouponUsage as Model<ICouponUsage>) ||
    mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);

export default CouponUsage;
