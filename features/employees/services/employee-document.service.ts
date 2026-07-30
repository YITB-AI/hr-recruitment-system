import { connectDB } from "@/server/db/connect";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { employeeDocumentRepository, type EmployeeDocumentRow } from "@/server/repositories/employee-document.repository";
import { employeeRepository } from "@/server/repositories/employee.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { saveFile, deleteFileByKey } from "@/lib/file-storage";

const EMPLOYEE_DOCUMENT_FOLDER = "employee-documents";

export async function getEmployeeAttachments(employeeId: string): Promise<EmployeeDocumentRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return employeeDocumentRepository.findByEmployeeId(companyId, employeeId);
}

export async function uploadEmployeeAttachment(
  employeeId: string,
  file: { originalName: string; mimeType: string; buffer: Buffer },
): Promise<EmployeeDocumentRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.update");

  const employee = await employeeRepository.findById(actor.companyId, employeeId);
  if (!employee) throw new Error("Employee not found");

  const { storageKey } = await saveFile(EMPLOYEE_DOCUMENT_FOLDER, file.originalName, file.buffer);

  const created = await employeeDocumentRepository.create({
    companyId: actor.companyId,
    employeeId,
    fileName: file.originalName,
    fileKey: storageKey,
    mimeType: file.mimeType,
    sizeBytes: file.buffer.byteLength,
    uploadedBy: resolveActorId(actor),
    uploadedByName: actor.name,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "employee_document.uploaded",
    entityType: "employee",
    entityId: employeeId,
    message: `${actor.name} uploaded "${file.originalName}" for ${employee.name}`,
  });

  return created;
}

export async function deleteEmployeeAttachment(employeeId: string, documentId: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.update");

  const doc = await employeeDocumentRepository.findById(actor.companyId, documentId);
  if (!doc || doc.employeeId !== employeeId) throw new Error("Document not found");

  await employeeDocumentRepository.deleteById(actor.companyId, documentId);
  await deleteFileByKey(doc.fileKey);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "employee_document.deleted",
    entityType: "employee",
    entityId: employeeId,
    message: `${actor.name} deleted "${doc.fileName}"`,
  });
}
