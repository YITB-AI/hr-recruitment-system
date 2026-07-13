"use server";

import { revalidatePath } from "next/cache";
import { generateDocumentSchema, bulkGenerateDocumentSchema } from "@/validators/generate-document";
import { documentStatusTransitionSchema } from "@/validators/document-status";
import {
  generateDocument,
  generateDocumentsBulk,
  type BulkGenerateResultItem,
} from "@/features/documents/services/generate-document.service";
import { transitionDocumentStatus } from "@/features/documents/services/document-history.service";
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
    const document = await generateDocument(
      parsed.data.templateId,
      { type: "employee", id: parsed.data.employeeId },
      parsed.data.values,
    );
    revalidatePath("/documents");
    return { success: true, document };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate document" };
  }
}

export type GenerateDocumentsBulkResult =
  | { success: true; batchId: string; results: BulkGenerateResultItem[] }
  | { success: false; error: string };

export async function generateDocumentsBulkAction(input: unknown): Promise<GenerateDocumentsBulkResult> {
  const parsed = bulkGenerateDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const { batchId, results } = await generateDocumentsBulk(parsed.data.templateId, parsed.data.recipients, parsed.data.values);
    revalidatePath("/documents");
    revalidatePath("/documents/history");
    return { success: true, batchId, results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate documents" };
  }
}

export type ActionResult = { success: true } | { success: false; error: string };

export async function deleteGeneratedDocumentAction(id: string): Promise<ActionResult> {
  try {
    await generatedDocumentRepository.delete(id);
    revalidatePath("/documents");
    revalidatePath("/documents/history");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete document" };
  }
}

export async function updateDocumentStatusAction(id: string, status: unknown): Promise<ActionResult> {
  const parsed = documentStatusTransitionSchema.safeParse({ status });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid status" };
  }

  try {
    await transitionDocumentStatus(id, parsed.data.status);
    revalidatePath("/documents");
    revalidatePath("/documents/history");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
  }
}
