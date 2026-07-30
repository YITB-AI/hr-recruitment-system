"use server";

import { revalidatePath } from "next/cache";
import {
  getEmployeeAttachments,
  uploadEmployeeAttachment,
  deleteEmployeeAttachment,
} from "@/features/employees/services/employee-document.service";
import type { EmployeeDocumentRow } from "@/server/repositories/employee-document.repository";

export type ActionResult = { success: true } | { success: false; error: string };
export type UploadEmployeeAttachmentResult = { success: true; document: EmployeeDocumentRow } | { success: false; error: string };

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function listEmployeeAttachmentsAction(employeeId: string): Promise<EmployeeDocumentRow[]> {
  return getEmployeeAttachments(employeeId);
}

export async function uploadEmployeeAttachmentAction(
  employeeId: string,
  formData: FormData,
): Promise<UploadEmployeeAttachmentResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a file first" };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return { success: false, error: "Only PDF, Word, or image files are supported" };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { success: false, error: "File must be smaller than 10MB" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadEmployeeAttachment(employeeId, {
      originalName: file.name,
      mimeType: file.type,
      buffer,
    });
    revalidatePath(`/employees/${employeeId}`);
    return { success: true, document };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload file" };
  }
}

export async function deleteEmployeeAttachmentAction(employeeId: string, documentId: string): Promise<ActionResult> {
  try {
    await deleteEmployeeAttachment(employeeId, documentId);
    revalidatePath(`/employees/${employeeId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete file" };
  }
}
