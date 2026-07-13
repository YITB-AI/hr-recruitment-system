"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { documentTemplateSchema } from "@/validators/document-template";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  detectVariablesFromUpload,
} from "@/features/documents/services/document-template.service";
import type { DetectedTemplateVariables } from "@/lib/docx";

export type ActionResult = { success: true } | { success: false; error: string };
export type DetectVariablesResult =
  | { success: true; detected: DetectedTemplateVariables }
  | { success: false; error: string };

export async function detectVariablesAction(formData: FormData): Promise<DetectVariablesResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a .docx file first" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectVariablesFromUpload(buffer);
    return { success: true, detected };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not read file" };
  }
}

function parseTemplateForm(formData: FormData) {
  const raw = {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    fields: JSON.parse(String(formData.get("fields") ?? "[]")),
  };
  return documentTemplateSchema.safeParse(raw);
}

export async function createTemplateAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "A .docx template file is required" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await createTemplate(parsed.data, { buffer, originalName: file.name });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create template" };
  }

  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateTemplateAction(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseTemplateForm(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  const hasNewFile = file instanceof File && file.size > 0;

  try {
    const fileInput = hasNewFile
      ? { buffer: Buffer.from(await (file as File).arrayBuffer()), originalName: (file as File).name }
      : null;
    const updated = await updateTemplate(id, parsed.data, fileInput);
    if (!updated) return { success: false, error: "Template not found" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update template" };
  }

  revalidatePath("/templates");
  redirect("/templates");
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  try {
    await deleteTemplate(id);
    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete template" };
  }
}
