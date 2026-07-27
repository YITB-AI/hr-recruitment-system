"use server";

import { revalidatePath } from "next/cache";
import { createLetterheadSchema, updateLetterheadMarginsSchema } from "@/validators/letterhead";
import { uploadLetterhead, deleteLetterhead, updateLetterheadMargins } from "@/features/settings/services/letterhead.service";

export type ActionResult = { success: true } | { success: false; error: string };

export async function uploadLetterheadAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose an image file first" };

  const parsed = createLetterheadSchema.safeParse({ name: String(formData.get("name") ?? "") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await uploadLetterhead(parsed.data.name, file);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload letterhead" };
  }

  revalidatePath("/settings");
  revalidatePath("/documents");
  return { success: true };
}

export async function updateLetterheadMarginsAction(id: string, contentTopMarginIn: number, contentBottomMarginIn: number): Promise<ActionResult> {
  const parsed = updateLetterheadMarginsSchema.safeParse({ contentTopMarginIn, contentBottomMarginIn });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateLetterheadMargins(id, parsed.data.contentTopMarginIn, parsed.data.contentBottomMarginIn);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update letterhead margins" };
  }

  revalidatePath("/settings");
  revalidatePath("/documents");
  return { success: true };
}

export async function deleteLetterheadAction(id: string): Promise<ActionResult> {
  try {
    await deleteLetterhead(id);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete letterhead" };
  }

  revalidatePath("/settings");
  revalidatePath("/documents");
  return { success: true };
}
