import mongoose, { Schema, Model, Document } from "mongoose";
import { ACCESS_AREAS } from "@/lib/access-areas";

export const ADMIN_ROLES = ["superadmin", "admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface IAdminUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    passwordHash: string;
    name: string;
    role: AdminRole;
    active: boolean;
    /** 10-digit Indian mobile used by the SMS-OTP login flow. */
    phone?: string;
    totpSecret?: string;
    totpEnabled: boolean;
    /** Allocated access areas for subadmins. Ignored for superadmin. */
    accessAreas?: ("seo" | "content" | "sales")[];
    createdAt: Date;
    updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
    {
        email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true, trim: true },
        role: { type: String, enum: ADMIN_ROLES, default: "superadmin", index: true },
        active: { type: Boolean, default: true },
        phone: { type: String, required: false, unique: true, sparse: true, index: true, match: /^\d{10}$/ },
        totpSecret: { type: String },
        totpEnabled: { type: Boolean, default: false },
        accessAreas: { type: [{ type: String, enum: [...ACCESS_AREAS] }], default: undefined },
    },
    { timestamps: true },
);

const AdminUser: Model<IAdminUser> =
    (mongoose.models.AdminUser as Model<IAdminUser>) || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);

export default AdminUser;
