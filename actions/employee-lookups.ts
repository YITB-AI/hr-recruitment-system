"use server";

import { revalidatePath } from "next/cache";
import {
  createEmployeeLookupSchema,
  updateEmployeeLookupSchema,
  reorderEmployeeLookupSchema,
} from "@/validators/employee-lookup";
import {
  createEmployeeLookup,
  updateEmployeeLookup,
  setEmployeeLookupActive,
  deleteEmployeeLookup,
  reorderEmployeeLookup,
} from "@/features/settings/services/employee-lookup.service";
import type { EmployeeLookupKind } from "@/constants/employee-lookup";

export type EmployeeLookupActionResult = { success: true } | { success: false; error: string };

export async function createEmployeeLookupAction(input: unknown): Promise<EmployeeLookupActionResult> {
  const parsed = createEmployeeLookupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const { kind, ...rest } = parsed.data;
    await createEmployeeLookup(kind, rest);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create" };
  }
}

export async function updateEmployeeLookupAction(input: unknown): Promise<EmployeeLookupActionResult> {
  const parsed = updateEmployeeLookupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const { kind, ...rest } = parsed.data;
    await updateEmployeeLookup(kind, rest);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update" };
  }
}

export async function setEmployeeLookupActiveAction(
  kind: EmployeeLookupKind,
  id: string,
  isActive: boolean,
): Promise<EmployeeLookupActionResult> {
  try {
    await setEmployeeLookupActive(kind, id, isActive);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update" };
  }
}

export async function deleteEmployeeLookupAction(kind: EmployeeLookupKind, id: string): Promise<EmployeeLookupActionResult> {
  try {
    await deleteEmployeeLookup(kind, id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete" };
  }
}

export async function reorderEmployeeLookupAction(input: unknown): Promise<EmployeeLookupActionResult> {
  const parsed = reorderEmployeeLookupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await reorderEmployeeLookup(parsed.data.kind, parsed.data.orderedIds);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reorder" };
  }
}
