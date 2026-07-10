"use server";

import { revalidatePath } from "next/cache";
import { generateDocumentSchema } from "@/validators/generate-document";
import { generateDocument } from "@/features/documents/services/generate-document.service";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";
import type { GeneratedDocumentRow } from "@/server/repositories/generated-document.repository";

export type GenerateDocumentResult =
  | { success: true; document: GeneratedDocumentRow }
  | { success: false; error: string };

export async function generateDocumentAction(input: unknown): Promise<GenerateDocumentResult> {
  const parsed = generateDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const document = await generateDocument(parsed.data.templateId, parsed.data.employeeId, parsed.data.values);
    revalidatePath("/documents");
    return { success: true, document };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate document" };
  }
}

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteGeneratedDocumentAction(id: string): Promise<ActionResult> {
  try {
    await generatedDocumentRepository.delete(id);
    revalidatePath("/documents");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete document" };
  }
}
