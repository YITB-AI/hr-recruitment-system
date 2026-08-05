import { describe, it, expect } from "vitest";
import { hasCompanyFeature, requireCompanyFeature, FeatureNotEnabledError } from "@/lib/auth/feature-access";

describe("lib/auth/feature-access", () => {
  it("always allows a core feature, regardless of enabledFeatures or featureAccessConfigured", () => {
    expect(hasCompanyFeature({ enabledFeatures: [], featureAccessConfigured: true }, "employees")).toBe(true);
    expect(hasCompanyFeature({ enabledFeatures: ["socialJobPosting"], featureAccessConfigured: true }, "employees")).toBe(true);
  });

  it("treats featureAccessConfigured=false as unrestricted (legacy companies, every non-core feature allowed)", () => {
    expect(hasCompanyFeature({ enabledFeatures: [], featureAccessConfigured: false }, "aiScreeningCalls")).toBe(true);
    expect(hasCompanyFeature({ enabledFeatures: [], featureAccessConfigured: false }, "n8nAutomations")).toBe(true);
  });

  it("once featureAccessConfigured=true, an empty enabledFeatures array means NO optional modules — not unrestricted", () => {
    expect(hasCompanyFeature({ enabledFeatures: [], featureAccessConfigured: true }, "aiScreeningCalls")).toBe(false);
    expect(hasCompanyFeature({ enabledFeatures: [], featureAccessConfigured: true }, "n8nAutomations")).toBe(false);
  });

  it("restricts a non-core feature to companies that were explicitly granted it", () => {
    expect(hasCompanyFeature({ enabledFeatures: ["aiScreeningCalls"], featureAccessConfigured: true }, "aiScreeningCalls")).toBe(true);
    expect(hasCompanyFeature({ enabledFeatures: ["aiScreeningCalls"], featureAccessConfigured: true }, "calendarIntegration")).toBe(false);
  });

  it("requireCompanyFeature throws FeatureNotEnabledError when denied, and is silent when allowed", () => {
    expect(() =>
      requireCompanyFeature({ enabledFeatures: ["socialJobPosting"], featureAccessConfigured: true }, "aiScreeningCalls"),
    ).toThrow(FeatureNotEnabledError);
    expect(() =>
      requireCompanyFeature({ enabledFeatures: ["aiScreeningCalls"], featureAccessConfigured: true }, "aiScreeningCalls"),
    ).not.toThrow();
    expect(() => requireCompanyFeature({ enabledFeatures: [], featureAccessConfigured: false }, "aiScreeningCalls")).not.toThrow();
    expect(() => requireCompanyFeature({ enabledFeatures: [], featureAccessConfigured: true }, "aiScreeningCalls")).toThrow(
      FeatureNotEnabledError,
    );
  });
});
