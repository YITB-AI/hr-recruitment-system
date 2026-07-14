"use server";

import { revalidatePath } from "next/cache";
import { createCompanySchema, updateCompanySchema, setCompanyStatusSchema } from "@/validators/company";
import {
  createCompanyWithAdmin,
  updateCompany,
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
    revalidatePath("/settings");
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
    await updateCompany(parsed.data.companyId, { name: parsed.data.name });
    revalidatePath("/settings");
    revalidatePath(`/settings/companies/${parsed.data.companyId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update company" };
  }
}

export async function setCompanyStatusAction(input: unknown): Promise<CompanyActionResult> {
  const parsed = setCompanyStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await setCompanyStatus(parsed.data.companyId, parsed.data.status);
    revalidatePath("/settings");
    revalidatePath(`/settings/companies/${parsed.data.companyId}`);
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
    revalidatePath(`/settings/companies/${companyId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload logo" };
  }
}

export async function deleteCompanyAction(companyId: string): Promise<CompanyActionResult> {
  try {
    await deleteCompany(companyId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete company" };
  }
}
