import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_FONT_KEY } from "@/constants/appearance";

// One row per company (tenant) once Phase 1 fully lands — currently still a
// true global singleton read via Setting.findOne() with no scoping, since
// companyId is optional-for-now (see the comment in models/User.ts) until
// migration + write-path wiring are complete. `companyId` will get a unique
// index once every row has one, making each company's row a de facto
// per-tenant singleton looked up by `{companyId}` instead of a bare findOne().
const settingSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    companyName: { type: String, required: true },
    timezone: { type: String, default: "Asia/Karachi" },
    dateFormat: { type: String, default: "MMM D, YYYY" },
    logoUrl: { type: String },
    // Company mailing/return address, shown alongside logoUrl in the
    // auto-injected document letterhead — see lib/docx-letterhead.ts.
    companyAddress: { type: String, trim: true },
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
