import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_FONT_KEY } from "@/constants/appearance";

// Singleton document (one row per organization). Read via Setting.findOne().
const settingSchema = new Schema(
  {
    companyName: { type: String, required: true },
    timezone: { type: String, default: "Asia/Karachi" },
    dateFormat: { type: String, default: "MMM D, YYYY" },
    logoUrl: { type: String },
    features: {
      aiResumeAnalysis: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
    },
    // Applied app-wide via CSS variables set on <html> in the root layout —
    // see getAppearanceStyle() in features/settings/services/settings.service.ts.
    appearance: {
      primaryColor: { type: String, default: DEFAULT_PRIMARY_COLOR },
      fontKey: { type: String, default: DEFAULT_FONT_KEY },
    },
  },
  { timestamps: true },
);

export type SettingDoc = InferSchemaType<typeof settingSchema>;

export const Setting: Model<SettingDoc> = models.Setting ?? model<SettingDoc>("Setting", settingSchema);
