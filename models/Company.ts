import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const COMPANY_STATUSES = ["active", "suspended"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

// The tenant entity. `slug` is the subdomain (acme.dax-hr.vercel.app) used by
// proxy.ts to resolve the active company on every request — see
// lib/auth/session.ts for the authoritative membership check.
const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: COMPANY_STATUSES, default: "active", index: true },
    logoUrl: { type: String },
  },
  { timestamps: true },
);

export type CompanyDoc = InferSchemaType<typeof companySchema>;

export const Company: Model<CompanyDoc> = models.Company ?? model<CompanyDoc>("Company", companySchema);
