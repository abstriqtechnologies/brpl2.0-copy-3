import mongoose, { Schema, Model, Document } from "mongoose";
import { SETTINGS_KEYS, type SettingsKey, isSecretKey } from "@/models/settings-keys";

// Re-export client-safe pieces so existing server-side importers (e.g. src/lib/settings.ts)
// keep working. Client components should import from "@/models/settings-keys" directly
// to avoid pulling mongoose into the browser bundle.
export { SETTINGS_KEYS, isSecretKey };
export type { SettingsKey };

export interface ISetting extends Document {
    _id: mongoose.Types.ObjectId;
    key: SettingsKey;
    value: string;
    secret: boolean;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
    {
        key: { type: String, required: true, unique: true, index: true, enum: SETTINGS_KEYS },
        value: { type: String, required: true },
        secret: { type: Boolean, required: true, default: false },
        updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    },
    { timestamps: true },
);

const Setting: Model<ISetting> =
    (mongoose.models.Setting as Model<ISetting>) || mongoose.model<ISetting>("Setting", SettingSchema);

export default Setting;