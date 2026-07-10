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
} from "@/features/settings/services/settings.service";

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
