import { CORE_COMPANY_FEATURE_KEYS, type CompanyFeatureKey } from "@/constants/company-features";

// The server-side enforcement half of the Global Super Admin's Model Access
// grant (see constants/company-features.ts and Company.enabledFeatures) --
// requireRole checks WHAT a role can do, this checks WHETHER a company was
// even granted the module the action belongs to. Both must pass; neither
// substitutes for the other.
export function hasCompanyFeature(company: { enabledFeatures: string[] }, key: CompanyFeatureKey): boolean {
  if ((CORE_COMPANY_FEATURE_KEYS as string[]).includes(key)) return true;
  // Empty/absent enabledFeatures means "unrestricted" -- see the comment on
  // Company.enabledFeatures -- not "nothing enabled". Every company created
  // before this registry existed has an empty array and must keep working
  // exactly as it did before this gate was added.
  if (!company.enabledFeatures || company.enabledFeatures.length === 0) return true;
  return company.enabledFeatures.includes(key);
}

export class FeatureNotEnabledError extends Error {
  constructor(key: CompanyFeatureKey) {
    super(`This feature (${key}) is not enabled for your company. Contact your platform administrator.`);
    this.name = "FeatureNotEnabledError";
  }
}

// Throws FeatureNotEnabledError on denial -- callers already sit inside the
// same try/catch -> {success:false, error} pattern requireRole's
// ForbiddenError relies on (Error subclass, human-readable message).
export function requireCompanyFeature(company: { enabledFeatures: string[] }, key: CompanyFeatureKey): void {
  if (!hasCompanyFeature(company, key)) throw new FeatureNotEnabledError(key);
}
