"use server";

import { revalidatePath } from "next/cache";
import { createDepartmentSchema, updateDepartmentSchema, reorderDepartmentsSchema } from "@/validators/department";
import {
  createDepartment,
  updateDepartment,
  setDepartmentActive,
  deleteDepartment,
  reorderDepartments,
} from "@/features/settings/services/department.service";

export type DepartmentActionResult = { success: true } | { success: false; error: string };

export async function createDepartmentAction(input: unknown): Promise<DepartmentActionResult> {
  const parsed = createDepartmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await createDepartment(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create department" };
  }
}

export async function updateDepartmentAction(input: unknown): Promise<DepartmentActionResult> {
  const parsed = updateDepartmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateDepartment(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update department" };
  }
}

export async function setDepartmentActiveAction(id: string, isActive: boolean): Promise<DepartmentActionResult> {
  try {
    await setDepartmentActive(id, isActive);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update department" };
  }
}

export async function deleteDepartmentAction(id: string): Promise<DepartmentActionResult> {
  try {
    await deleteDepartment(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete department" };
  }
}

export async function reorderDepartmentsAction(input: unknown): Promise<DepartmentActionResult> {
  const parsed = reorderDepartmentsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await reorderDepartments(parsed.data.orderedIds);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reorder departments" };
  }
}
