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
    // Company profile fields, set once at creation via the platform admin's
    // "Create New Company" wizard — all optional, purely informational today
    // (not read by any business logic), matching the wizard's Basic
    // Information step.
    legalName: { type: String, trim: true },
    industry: { type: String, trim: true },
    companySize: { type: String, trim: true },
    adminPhone: { type: String, trim: true },
    country: { type: String, trim: true },
    defaultLanguage: { type: String, trim: true, default: "en" },
    // Global Super Admin's per-company Model Access grant (see
    // constants/company-features.ts). Stores only the non-core keys this
    // company has been granted — core keys are always on and never stored
    // here.
    enabledFeatures: { type: [String], default: [] },
    // Whether enabledFeatures reflects a real, explicit choice. Mongoose
    // applies schema defaults even when hydrating pre-existing documents
    // that never had this field at all, so an empty enabledFeatures array
    // is indistinguishable from "never set" at the storage level — this
    // flag is what actually distinguishes them. false (every company that
    // existed before Model Access shipped) means "unrestricted" (every
    // feature enabled), so nothing already relying on a feature is
    // retroactively locked out. true (every company created via the
    // wizard, or ever explicitly edited from its detail page) means
    // enabledFeatures is enforced literally — including a deliberate empty
    // array, which then correctly means "no optional modules granted".
    featureAccessConfigured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type CompanyDoc = InferSchemaType<typeof companySchema>;

export const Company: Model<CompanyDoc> = models.Company ?? model<CompanyDoc>("Company", companySchema);
