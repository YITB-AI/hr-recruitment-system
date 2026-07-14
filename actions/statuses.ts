"use server";

import { revalidatePath } from "next/cache";
import { createStatusSchema, updateStatusSchema, reorderStatusesSchema } from "@/validators/status";
import {
  createStatus,
  updateStatus,
  setStatusActive,
  deleteStatus,
  reorderStatuses,
} from "@/features/settings/services/status-management.service";
import type { StatusModule } from "@/constants/status-module";

export type StatusActionResult = { success: true } | { success: false; error: string };

export async function createStatusAction(input: unknown): Promise<StatusActionResult> {
  const parsed = createStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await createStatus(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create status" };
  }
}

export async function updateStatusAction(input: unknown): Promise<StatusActionResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateStatus(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
  }
}

export async function setStatusActiveAction(id: string, module: StatusModule, isActive: boolean): Promise<StatusActionResult> {
  try {
    await setStatusActive(id, module, isActive);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
  }
}

export async function deleteStatusAction(id: string, module: StatusModule): Promise<StatusActionResult> {
  try {
    await deleteStatus(id, module);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete status" };
  }
}

export async function reorderStatusesAction(input: unknown): Promise<StatusActionResult> {
  const parsed = reorderStatusesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await reorderStatuses(parsed.data.module, parsed.data.orderedIds);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reorder statuses" };
  }
}
