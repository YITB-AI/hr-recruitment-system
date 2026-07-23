"use server";

import { revalidatePath } from "next/cache";
import {
  generalSettingsSchema,
  notificationSettingsSchema,
  appearanceSettingsSchema,
} from "@/validators/settings";
import {
  updateGeneralSettings,
  updateNotificationSettings,
  updateAppearanceSettings,
  uploadCompanyLogo,
} from "@/features/settings/services/settings.service";
import { assignJobToCompany } from "@/features/settings/services/job-mapping.service";
import { repairOrphanedApplicant } from "@/features/settings/services/data-repair.service";

export type ActionResult = { success: true } | { success: false; error: string };

export async function updateGeneralSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateGeneralSettings(parsed.data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateNotificationSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateNotificationSettings(parsed.data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateAppearanceSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = appearanceSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateAppearanceSettings(parsed.data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save" };
  }

  // Appearance is applied on <html> in the root layout, so every route needs
  // to re-render, not just /settings.
  revalidatePath("/", "layout");
  return { success: true };
}

export async function uploadCompanyLogoAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose an image file first" };

  try {
    await uploadCompanyLogo(file);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload logo" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function assignJobToCompanyAction(jobId: string, companyId: string): Promise<ActionResult> {
  if (!jobId || !companyId) return { success: false, error: "Select a company" };

  try {
    await assignJobToCompany(jobId, companyId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to assign job" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function repairOrphanedApplicantAction(applicantId: string, companyId: string): Promise<ActionResult> {
  if (!applicantId || !companyId) return { success: false, error: "Select a company" };

  try {
    await repairOrphanedApplicant(applicantId, companyId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to repair record" };
  }

  revalidatePath("/settings");
  return { success: true };
}
