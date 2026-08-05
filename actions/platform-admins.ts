"use server";

import { revalidatePath } from "next/cache";
import { grantPlatformAdminSchema } from "@/validators/platform-admin";
import { grantPlatformAdmin, revokePlatformAdmin } from "@/features/platform/services/platform-admin-management.service";

export type PlatformAdminActionResult = { success: true } | { success: false; error: string };

export async function grantPlatformAdminAction(input: unknown): Promise<PlatformAdminActionResult> {
  const parsed = grantPlatformAdminSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await grantPlatformAdmin(parsed.data.email);
    revalidatePath("/platform/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to grant platform admin access" };
  }
}

export async function revokePlatformAdminAction(userId: string): Promise<PlatformAdminActionResult> {
  try {
    await revokePlatformAdmin(userId);
    revalidatePath("/platform/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to revoke platform admin access" };
  }
}
