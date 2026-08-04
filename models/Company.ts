import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const COMPANY_STATUSES = ["active", "suspended"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

// The tenant entity. `slug` is the company's login identifier (entered on
// the login form as "Company ID", not resolved from a subdomain — an
// earlier subdomain-based design was abandoned because `dax-hr.vercel.app`
// is a shared Vercel alias domain that can't get a wildcard TLS cert; see
// lib/auth/session.ts's verifySessionToken, which is the authoritative
// tenant-membership check — the session token alone determines companyId,
// there is no subdomain/host-based resolution anywhere in this app).
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
