import mongoose, { Schema, Model, Document } from "mongoose";

export type ActivityRole = "user" | "admin" | null;

export interface IActivityEvent extends Document {
    _id: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId | null;
    sessionId: string;
    role: ActivityRole;
    path: string;
    target: { tag: string; text?: string; href?: string };
    ts: Date;
}

const ActivityEventSchema = new Schema<IActivityEvent>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
        sessionId: { type: String, required: true, index: true },
        role: { type: String, enum: ["user", "admin", null], default: null },
        path: { type: String, required: true, index: true },
        target: {
            tag: { type: String, required: true },
            text: { type: String, default: undefined },
            href: { type: String, default: undefined },
        },
        ts: { type: Date, required: true, default: Date.now },
    },
    { timestamps: false },
);

ActivityEventSchema.index({ userId: 1, ts: -1 });
ActivityEventSchema.index({ ts: -1 });

const ActivityEvent: Model<IActivityEvent> =
    (mongoose.models.ActivityEvent as Model<IActivityEvent>) ||
    mongoose.model<IActivityEvent>("ActivityEvent", ActivityEventSchema);

export default ActivityEvent;
