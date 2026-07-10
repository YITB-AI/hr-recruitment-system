import { connectDB } from "@/server/db/connect";
import {
  documentTemplateRepository,
  type DocumentTemplateRow,
} from "@/server/repositories/document-template.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { saveFile, deleteFileByKey } from "@/lib/file-storage";
import { extractTemplateVariables } from "@/lib/docx";
import { getCurrentUser } from "@/lib/current-user";
import type { DocumentTemplateInput } from "@/validators/document-template";

const TEMPLATE_FOLDER = "templates";

export async function listTemplates(): Promise<DocumentTemplateRow[]> {
  await connectDB();
  return documentTemplateRepository.findAll();
}

export async function getTemplate(id: string): Promise<DocumentTemplateRow | null> {
  await connectDB();
  return documentTemplateRepository.findById(id);
}

export function detectVariablesFromUpload(buffer: Buffer): string[] {
  return extractTemplateVariables(buffer);
}

export async function createTemplate(
  input: DocumentTemplateInput,
  file: { buffer: Buffer; originalName: string },
): Promise<DocumentTemplateRow> {
  await connectDB();

  const { storageKey } = await saveFile(TEMPLATE_FOLDER, file.originalName, file.buffer);

  const template = await documentTemplateRepository.create({
    name: input.name,
    category: input.category,
    description: input.description,
    fileName: file.originalName,
    fileUrl: `/api/files/${storageKey}`,
    fields: input.fields,
  });

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "template.created",
    entityType: "document",
    entityId: template._id,
    message: `${actor.name} created template "${template.name}"`,
  });

  return template;
}

export async function updateTemplate(
  id: string,
  input: DocumentTemplateInput,
  file: { buffer: Buffer; originalName: string } | null,
): Promise<DocumentTemplateRow | null> {
  await connectDB();

  const existing = await documentTemplateRepository.findById(id);
  if (!existing) return null;

  let fileFields: { fileName: string; fileUrl: string } | undefined;
  if (file) {
    const { storageKey } = await saveFile(TEMPLATE_FOLDER, file.originalName, file.buffer);
    fileFields = { fileName: file.originalName, fileUrl: `/api/files/${storageKey}` };
    await deleteFileByKey(existing.fileUrl.replace("/api/files/", ""));
  }

  const updated = await documentTemplateRepository.update(id, {
    name: input.name,
    category: input.category,
    description: input.description,
    fields: input.fields,
    ...fileFields,
  });

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "template.updated",
    entityType: "document",
    entityId: id,
    message: `${actor.name} updated template "${input.name}"`,
  });

  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  await connectDB();

  const existing = await documentTemplateRepository.findById(id);
  if (!existing) throw new Error("Template not found");

  await deleteFileByKey(existing.fileUrl.replace("/api/files/", ""));
  await documentTemplateRepository.delete(id);

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "template.deleted",
    entityType: "document",
    entityId: id,
    message: `${actor.name} deleted template "${existing.name}"`,
  });
}
