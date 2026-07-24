"use server";

import { revalidatePath } from "next/cache";
import {
  updateWebhookConfigSchema,
  updateEmailConfigSchema,
  updateLinkedinConfigSchema,
  updateFacebookAppCredentialsSchema,
  updateXAppCredentialsSchema,
} from "@/validators/company-integration-config";
import {
  updateWebhookConfig,
  updateEmailConfig,
  updateLinkedinConfig,
  updateFacebookAppCredentials,
  updateXAppCredentials,
  setIndeedFeedEnabled,
} from "@/features/settings/services/company-integration-config.service";

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

export async function updateLinkedinConfigAction(input: unknown): Promise<CompanyIntegrationConfigActionResult> {
  const parsed = updateLinkedinConfigSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateLinkedinConfig(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update LinkedIn configuration" };
  }
}

export async function updateFacebookAppCredentialsAction(input: unknown): Promise<CompanyIntegrationConfigActionResult> {
  const parsed = updateFacebookAppCredentialsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateFacebookAppCredentials(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update Facebook app credentials" };
  }
}

export async function updateXAppCredentialsAction(input: unknown): Promise<CompanyIntegrationConfigActionResult> {
  const parsed = updateXAppCredentialsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateXAppCredentials(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update X app credentials" };
  }
}

export async function setIndeedFeedEnabledAction(feedEnabled: boolean): Promise<CompanyIntegrationConfigActionResult> {
  try {
    await setIndeedFeedEnabled(feedEnabled);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update Indeed feed setting" };
  }
}
