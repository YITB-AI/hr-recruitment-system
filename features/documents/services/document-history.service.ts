import { connectDB } from "@/server/db/connect";
import {
  generatedDocumentRepository,
  type GeneratedDocumentFilters,
  type GeneratedDocumentRow,
  type GeneratedDocumentStatus,
} from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";

const PAGE_SIZE = 20;

// Documents move forward only: generated -> sent -> signed. No going back.
const ALLOWED_NEXT_STATUS: Record<GeneratedDocumentStatus, GeneratedDocumentStatus[]> = {
  generated: ["sent"],
  sent: ["signed"],
  signed: [],
};

export async function listDocumentHistory(filters: GeneratedDocumentFilters, page = 1) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return generatedDocumentRepository.find(companyId, filters, { page, pageSize: PAGE_SIZE });
}

export async function transitionDocumentStatus(id: string, newStatus: GeneratedDocumentStatus): Promise<GeneratedDocumentRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "document.status.transition");

  const current = await generatedDocumentRepository.findById(actor.companyId, id);
  if (!current) throw new Error("Document not found");

  const currentStatus = current.status as GeneratedDocumentStatus;
  if (!ALLOWED_NEXT_STATUS[currentStatus]?.includes(newStatus)) {
    throw new Error(`Cannot move a document from "${currentStatus}" to "${newStatus}"`);
  }

  const actorId = actor.id === "system" ? undefined : actor.id;
  const updated = await generatedDocumentRepository.updateStatus(actor.companyId, id, newStatus, actorId);
  if (!updated) throw new Error("Document not found");

  const recipientName = updated.employee?.name ?? updated.applicant?.name ?? "recipient";
  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId,
    actorName: actor.name,
    action: "document.status_changed",
    entityType: "document",
    entityId: updated._id,
    message: `${actor.name} marked "${updated.fileName}" for ${recipientName} as ${newStatus}`,
  });

  return updated;
}
