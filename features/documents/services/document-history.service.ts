import { connectDB } from "@/server/db/connect";
import {
  generatedDocumentRepository,
  type GeneratedDocumentFilters,
  type GeneratedDocumentRow,
  type GeneratedDocumentStatus,
} from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";

const PAGE_SIZE = 20;

// Documents move forward only: generated -> sent -> signed. No going back.
const ALLOWED_NEXT_STATUS: Record<GeneratedDocumentStatus, GeneratedDocumentStatus[]> = {
  generated: ["sent"],
  sent: ["signed"],
  signed: [],
};

export async function listDocumentHistory(filters: GeneratedDocumentFilters, page = 1) {
  await connectDB();
  return generatedDocumentRepository.find(filters, { page, pageSize: PAGE_SIZE });
}

export async function transitionDocumentStatus(id: string, newStatus: GeneratedDocumentStatus): Promise<GeneratedDocumentRow> {
  await connectDB();

  const current = await generatedDocumentRepository.findById(id);
  if (!current) throw new Error("Document not found");

  const currentStatus = current.status as GeneratedDocumentStatus;
  if (!ALLOWED_NEXT_STATUS[currentStatus]?.includes(newStatus)) {
    throw new Error(`Cannot move a document from "${currentStatus}" to "${newStatus}"`);
  }

  const actor = await getCurrentUser();
  const actorId = actor.id === "no-users-seeded" ? undefined : actor.id;
  const updated = await generatedDocumentRepository.updateStatus(id, newStatus, actorId);
  if (!updated) throw new Error("Document not found");

  const recipientName = updated.employee?.name ?? updated.applicant?.name ?? "recipient";
  await activityLogRepository.create({
    actorId,
    actorName: actor.name,
    action: "document.status_changed",
    entityType: "document",
    entityId: updated._id,
    message: `${actor.name} marked "${updated.fileName}" for ${recipientName} as ${newStatus}`,
  });

  return updated;
}
