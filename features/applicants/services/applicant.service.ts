import { connectDB } from "@/server/db/connect";
import {
  applicantRepository,
  type ApplicantDetailRow,
  type ApplicantListFilters,
  type ApplicantKanbanFilters,
} from "@/server/repositories/applicant.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { resumeAnalysisRepository, type ResumeAnalysisRow } from "@/server/repositories/resume-analysis.repository";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";
import { getCurrentUser } from "@/lib/current-user";
import { APPLICANT_STATUS_CONFIG, type ApplicantStatus } from "@/constants/applicant-status";

export async function getApplicantsPageData(filters: ApplicantListFilters) {
  await connectDB();
  return applicantRepository.findAllPaginated(filters);
}

export async function getApplicantsKanbanData(filters: ApplicantKanbanFilters) {
  await connectDB();
  return applicantRepository.findAllForKanban(filters);
}

export async function getApplicantDetail(id: string): Promise<ApplicantDetailRow | null> {
  await connectDB();
  return applicantRepository.findById(id);
}

export async function getApplicantResumeAnalysis(id: string): Promise<ResumeAnalysisRow | null> {
  await connectDB();
  return resumeAnalysisRepository.findByApplicantId(id);
}

export async function getApplicantDocuments(id: string) {
  await connectDB();
  return generatedDocumentRepository.findByApplicantId(id);
}

export async function changeApplicantStatus(id: string, status: ApplicantStatus): Promise<ApplicantDetailRow> {
  await connectDB();
  const updated = await applicantRepository.updateStatus(id, status);
  if (!updated) throw new Error("Applicant not found");

  const actor = await getCurrentUser();
  const label = APPLICANT_STATUS_CONFIG[status].label;
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: `applicant.${status}`,
    entityType: "applicant",
    entityId: id,
    message: `${updated.name}'s status changed to ${label}${updated.jobId ? ` for ${updated.jobId.title}` : ""}`,
  });

  return updated;
}

export function shortlistApplicant(id: string) {
  return changeApplicantStatus(id, "shortlisted");
}

export function rejectApplicant(id: string) {
  return changeApplicantStatus(id, "rejected");
}

export async function bulkChangeApplicantStatus(ids: string[], status: ApplicantStatus): Promise<{ successCount: number }> {
  await connectDB();

  const targets = await applicantRepository.findMinimalByIds(ids);
  const successCount = await applicantRepository.updateStatusMany(ids, status);

  if (targets.length > 0) {
    const actor = await getCurrentUser();
    const label = APPLICANT_STATUS_CONFIG[status].label;
    await activityLogRepository.createMany(
      targets.map((target) => ({
        actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
        actorName: actor.name,
        action: `applicant.${status}`,
        entityType: "applicant" as const,
        entityId: target._id,
        message: `${target.name}'s status changed to ${label}${target.jobId ? ` for ${target.jobId.title}` : ""}`,
      })),
    );
  }

  return { successCount };
}
