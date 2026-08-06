"use server";

import { revalidatePath } from "next/cache";
import { createCompanySchema, updateCompanySchema, updateCompanyConfigurationSchema, setCompanyStatusSchema } from "@/validators/company";
import { isValidCompanyFeatureKey } from "@/constants/company-features";
import {
  createCompanyWithAdmin,
  updateCompany,
  updateCompanyConfiguration,
  updateCompanyFeatures,
  setCompanyStatus,
  uploadCompanyLogo,
  deleteCompany,
  type CreateCompanyResult,
} from "@/features/settings/services/company-management.service";

export type CreateCompanyActionResult =
  | { success: true; result: CreateCompanyResult }
  | { success: false; error: string };

export async function createCompanyAction(input: unknown): Promise<CreateCompanyActionResult> {
  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await createCompanyWithAdmin(parsed.data);
    revalidatePath("/platform/companies");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create company" };
  }
}

export type CompanyActionResult = { success: true } | { success: false; error: string };

export async function updateCompanyAction(input: unknown): Promise<CompanyActionResult> {
  const parsed = updateCompanySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const { companyId, ...rest } = parsed.data;
    await updateCompany(companyId, rest);
    revalidatePath("/platform/companies");
    revalidatePath(`/platform/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update company" };
  }
}

export async function updateCompanyConfigurationAction(input: unknown): Promise<CompanyActionResult> {
  const parsed = updateCompanyConfigurationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const { companyId, ...rest } = parsed.data;
    await updateCompanyConfiguration(companyId, rest);
    revalidatePath(`/platform/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update configuration" };
  }
}

export async function updateCompanyFeaturesAction(companyId: string, enabledFeatures: unknown): Promise<CompanyActionResult> {
  if (!Array.isArray(enabledFeatures) || !enabledFeatures.every((k) => typeof k === "string" && isValidCompanyFeatureKey(k))) {
    return { success: false, error: "Invalid feature selection" };
  }

  try {
    await updateCompanyFeatures(companyId, enabledFeatures);
    revalidatePath(`/platform/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update features" };
  }
}

export async function setCompanyStatusAction(input: unknown): Promise<CompanyActionResult> {
  const parsed = setCompanyStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await setCompanyStatus(parsed.data.companyId, parsed.data.status);
    revalidatePath("/platform/companies");
    revalidatePath(`/platform/companies/${parsed.data.companyId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update company status" };
  }
}

export async function uploadCompanyLogoAction(companyId: string, formData: FormData): Promise<CompanyActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose an image file first" };

  try {
    await uploadCompanyLogo(companyId, file);
    revalidatePath(`/platform/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload logo" };
  }
}

export async function deleteCompanyAction(companyId: string): Promise<CompanyActionResult> {
  try {
    await deleteCompany(companyId);
    revalidatePath("/platform/companies");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete company" };
  }
}
