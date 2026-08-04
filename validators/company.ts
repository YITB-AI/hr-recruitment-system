import { z } from "zod";
import { isValidCompanyFeatureKey } from "@/constants/company-features";

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().min(1, "Admin email is required").email("Enter a valid email"),
  // Basic Information (wizard step 1) — all optional, informational only.
  legalName: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(100).optional(),
  companySize: z.string().trim().max(50).optional(),
  adminPhone: z.string().trim().max(30).optional(),
  country: z.string().trim().max(100).optional(),
  defaultLanguage: z.string().trim().max(10).optional(),
  // Features & Modules (wizard step 2) — non-core keys only; validated
  // against the real registry so a stale/typo'd key can never persist.
  enabledFeatures: z.array(z.string().refine(isValidCompanyFeatureKey, "Unknown feature key")).optional(),
  // Configurations (wizard step 3) — platform config + branding, all
  // optional so the wizard can be submitted with sensible defaults applied.
  timezone: z.string().trim().max(60).optional(),
  weekStartsOn: z.enum(["sunday", "monday"]).optional(),
  dateFormat: z.string().trim().max(30).optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  currency: z.string().trim().max(10).optional(),
  numberFormat: z.string().trim().max(20).optional(),
  multiLanguageEnabled: z.boolean().optional(),
  primaryColor: z.string().trim().max(60).optional(),
  secondaryColor: z.string().trim().max(60).optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1, "Company name is required"),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const setCompanyStatusSchema = z.object({
  companyId: z.string().min(1),
  status: z.enum(["active", "suspended"]),
});
export type SetCompanyStatusInput = z.infer<typeof setCompanyStatusSchema>;
