import { CORE_COMPANY_FEATURE_KEYS, type CompanyFeatureKey } from "@/constants/company-features";

export type FeatureAccessCompany = { enabledFeatures: string[]; featureAccessConfigured: boolean };

// The server-side enforcement half of the Global Super Admin's Model Access
// grant (see constants/company-features.ts and Company.enabledFeatures) --
// requireRole checks WHAT a role can do, this checks WHETHER a company was
// even granted the module the action belongs to. Both must pass; neither
// substitutes for the other.
export function hasCompanyFeature(company: FeatureAccessCompany, key: CompanyFeatureKey): boolean {
  if ((CORE_COMPANY_FEATURE_KEYS as string[]).includes(key)) return true;
  // featureAccessConfigured=false means this company predates Model Access
  // (or was created before the wizard's explicit-choice step existed) --
  // treated as unrestricted so nothing already relying on a feature is
  // retroactively locked out. Once a real choice has been made (wizard
  // creation, or an explicit edit from the company's detail page),
  // enabledFeatures is enforced literally -- including a deliberate empty
  // array, which correctly means "no optional modules granted" rather than
  // "unrestricted". See the comment on Company.featureAccessConfigured for
  // why this can't be inferred from enabledFeatures alone.
  if (!company.featureAccessConfigured) return true;
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
export function requireCompanyFeature(company: FeatureAccessCompany, key: CompanyFeatureKey): void {
  if (!hasCompanyFeature(company, key)) throw new FeatureNotEnabledError(key);
}
