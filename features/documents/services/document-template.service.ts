import { connectDB } from "@/server/db/connect";
import {
  documentTemplateRepository,
  type DocumentTemplateRow,
} from "@/server/repositories/document-template.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { saveFile, deleteFileByKey } from "@/lib/file-storage";
import { extractTemplateVariables, type DetectedTemplateVariables } from "@/lib/docx";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { DocumentTemplateInput } from "@/validators/document-template";
import type { TemplateMilestoneType } from "@/constants/document-template";

const TEMPLATE_FOLDER = "templates";

export async function listTemplates(): Promise<DocumentTemplateRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return documentTemplateRepository.findAll(companyId);
}

export async function getTemplate(id: string): Promise<DocumentTemplateRow | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return documentTemplateRepository.findById(companyId, id);
}

export function detectVariablesFromUpload(buffer: Buffer): DetectedTemplateVariables {
  return extractTemplateVariables(buffer);
}

// Used by dashboard.service.ts's "Upcoming Employee Actions" widget to
// resolve which template (if any) to preselect for a given milestone.
export async function findTemplateForMilestone(companyId: string, milestoneType: TemplateMilestoneType) {
  return documentTemplateRepository.findByMilestoneType(companyId, milestoneType);
}

export async function createTemplate(
  input: DocumentTemplateInput,
  file: { buffer: Buffer; originalName: string },
): Promise<DocumentTemplateRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "document.template.manage");

  const { storageKey } = await saveFile(TEMPLATE_FOLDER, file.originalName, file.buffer);

  const template = await documentTemplateRepository.create(actor.companyId, {
    name: input.name,
    category: input.category,
    description: input.description,
    fileName: file.originalName,
    fileUrl: `/api/files/${storageKey}`,
    fields: input.fields,
    milestoneType: input.milestoneType,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
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
  const actor = await getCurrentUser();
  requireRole(actor, "document.template.manage");

  const existing = await documentTemplateRepository.findById(actor.companyId, id);
  if (!existing) return null;

  let fileFields: { fileName: string; fileUrl: string } | undefined;
  if (file) {
    const { storageKey } = await saveFile(TEMPLATE_FOLDER, file.originalName, file.buffer);
    fileFields = { fileName: file.originalName, fileUrl: `/api/files/${storageKey}` };
    await deleteFileByKey(existing.fileUrl.replace("/api/files/", ""));
  }

  const updated = await documentTemplateRepository.update(actor.companyId, id, {
    name: input.name,
    category: input.category,
    description: input.description,
    fields: input.fields,
    milestoneType: input.milestoneType,
    ...fileFields,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
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
  const actor = await getCurrentUser();
  requireRole(actor, "document.template.manage");

  const existing = await documentTemplateRepository.findById(actor.companyId, id);
  if (!existing) throw new Error("Template not found");

  await deleteFileByKey(existing.fileUrl.replace("/api/files/", ""));
  await documentTemplateRepository.delete(actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "template.deleted",
    entityType: "document",
    entityId: id,
    message: `${actor.name} deleted template "${existing.name}"`,
  });
}
