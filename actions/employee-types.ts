"use server";

import { revalidatePath } from "next/cache";
import { createEmployeeTypeSchema, updateEmployeeTypeSchema, reorderEmployeeTypesSchema } from "@/validators/employee-type";
import {
  createEmployeeType,
  updateEmployeeType,
  setEmployeeTypeActive,
  deleteEmployeeType,
  reorderEmployeeTypes,
} from "@/features/settings/services/employee-type.service";

export type EmployeeTypeActionResult = { success: true } | { success: false; error: string };

export async function createEmployeeTypeAction(input: unknown): Promise<EmployeeTypeActionResult> {
  const parsed = createEmployeeTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await createEmployeeType(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create employee type" };
  }
}

export async function updateEmployeeTypeAction(input: unknown): Promise<EmployeeTypeActionResult> {
  const parsed = updateEmployeeTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateEmployeeType(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update employee type" };
  }
}

export async function setEmployeeTypeActiveAction(id: string, isActive: boolean): Promise<EmployeeTypeActionResult> {
  try {
    await setEmployeeTypeActive(id, isActive);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update employee type" };
  }
}

export async function deleteEmployeeTypeAction(id: string): Promise<EmployeeTypeActionResult> {
  try {
    await deleteEmployeeType(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete employee type" };
  }
}

export async function reorderEmployeeTypesAction(input: unknown): Promise<EmployeeTypeActionResult> {
  const parsed = reorderEmployeeTypesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await reorderEmployeeTypes(parsed.data.orderedIds);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reorder employee types" };
  }
}
