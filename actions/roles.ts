"use server";

import { revalidatePath } from "next/cache";
import { createRoleSchema, updateRoleSchema } from "@/validators/role";
import { createRole, updateRole, deleteRole } from "@/features/platform/services/role-management.service";

export type RoleActionResult = { success: true } | { success: false; error: string };

export async function createRoleAction(input: unknown): Promise<RoleActionResult> {
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await createRole(parsed.data);
    revalidatePath("/platform/roles");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create role" };
  }
}

export async function updateRoleAction(input: unknown): Promise<RoleActionResult> {
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateRole(parsed.data);
    revalidatePath("/platform/roles");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update role" };
  }
}

export async function deleteRoleAction(key: string): Promise<RoleActionResult> {
  try {
    await deleteRole(key);
    revalidatePath("/platform/roles");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete role" };
  }
}
