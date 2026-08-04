import { describe, it, expect } from "vitest";
import { hasCompanyFeature, requireCompanyFeature, FeatureNotEnabledError } from "@/lib/auth/feature-access";

describe("lib/auth/feature-access", () => {
  it("always allows a core feature, regardless of enabledFeatures", () => {
    expect(hasCompanyFeature({ enabledFeatures: [] }, "employees")).toBe(true);
    expect(hasCompanyFeature({ enabledFeatures: ["socialJobPosting"] }, "employees")).toBe(true);
  });

  it("treats an empty enabledFeatures array as unrestricted (every non-core feature allowed)", () => {
    expect(hasCompanyFeature({ enabledFeatures: [] }, "aiScreeningCalls")).toBe(true);
    expect(hasCompanyFeature({ enabledFeatures: [] }, "n8nAutomations")).toBe(true);
  });

  it("restricts a non-core feature to companies that were explicitly granted it", () => {
    expect(hasCompanyFeature({ enabledFeatures: ["aiScreeningCalls"] }, "aiScreeningCalls")).toBe(true);
    expect(hasCompanyFeature({ enabledFeatures: ["aiScreeningCalls"] }, "calendarIntegration")).toBe(false);
  });

  it("requireCompanyFeature throws FeatureNotEnabledError when denied, and is silent when allowed", () => {
    expect(() => requireCompanyFeature({ enabledFeatures: ["socialJobPosting"] }, "aiScreeningCalls")).toThrow(
      FeatureNotEnabledError,
    );
    expect(() => requireCompanyFeature({ enabledFeatures: ["aiScreeningCalls"] }, "aiScreeningCalls")).not.toThrow();
    expect(() => requireCompanyFeature({ enabledFeatures: [] }, "aiScreeningCalls")).not.toThrow();
  });
});
