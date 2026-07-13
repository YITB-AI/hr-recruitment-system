"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSavedView, deleteSavedView } from "@/features/applicants/services/saved-view.service";

export type ActionResult = { success: true } | { success: false; error: string };

const createSavedViewSchema = z.object({
  name: z.string().min(1, "Name is required"),
  filters: z.record(z.string(), z.string()),
});

export async function createSavedViewAction(input: unknown): Promise<ActionResult> {
  const parsed = createSavedViewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await createSavedView(parsed.data.name, parsed.data.filters);
    revalidatePath("/applicants");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save view" };
  }
}

export async function deleteSavedViewAction(id: string): Promise<ActionResult> {
  try {
    await deleteSavedView(id);
    revalidatePath("/applicants");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete view" };
  }
}
