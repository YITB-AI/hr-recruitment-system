"use server";

import { revalidatePath } from "next/cache";
import { updateWebhookConfigSchema, updateEmailConfigSchema } from "@/validators/company-integration-config";
import { updateWebhookConfig, updateEmailConfig } from "@/features/settings/services/company-integration-config.service";

export type CompanyIntegrationConfigActionResult = { success: true } | { success: false; error: string };

export async function updateWebhookConfigAction(input: unknown): Promise<CompanyIntegrationConfigActionResult> {
  const parsed = updateWebhookConfigSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateWebhookConfig(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update webhook configuration" };
  }
}

export async function updateEmailConfigAction(input: unknown): Promise<CompanyIntegrationConfigActionResult> {
  const parsed = updateEmailConfigSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateEmailConfig(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update email configuration" };
  }
}
