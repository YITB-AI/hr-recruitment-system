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
import { requireRole } from "@/lib/auth/permissions";
import { APPLICANT_STATUS_CONFIG, type ApplicantStatus } from "@/constants/applicant-status";

export async function getApplicantsPageData(filters: ApplicantListFilters) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return applicantRepository.findAllPaginated(companyId, filters);
}

export async function getApplicantsKanbanData(filters: ApplicantKanbanFilters) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return applicantRepository.findAllForKanban(companyId, filters);
}

export async function getApplicantDetail(id: string): Promise<ApplicantDetailRow | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return applicantRepository.findById(companyId, id);
}

// resumeAnalysisRepository isn't companyId-scoped itself (n8n-authored, see
// its own file) — isolation here comes from first confirming the applicant
// actually belongs to the caller's company before ever looking up its score.
export async function getApplicantResumeAnalysis(id: string): Promise<ResumeAnalysisRow | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  const applicant = await applicantRepository.findById(companyId, id);
  if (!applicant) return null;
  return resumeAnalysisRepository.findByApplicantId(id);
}

export async function getApplicantDocuments(id: string) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return generatedDocumentRepository.findByApplicantId(companyId, id);
}

export async function changeApplicantStatus(id: string, status: ApplicantStatus): Promise<ApplicantDetailRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.status.change");

  const updated = await applicantRepository.updateStatus(actor.companyId, id, status);
  if (!updated) throw new Error("Applicant not found");

  const label = APPLICANT_STATUS_CONFIG[status].label;
  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
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
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.status.change");

  const targets = await applicantRepository.findMinimalByIds(actor.companyId, ids);
  const successCount = await applicantRepository.updateStatusMany(actor.companyId, ids, status);

  if (targets.length > 0) {
    const label = APPLICANT_STATUS_CONFIG[status].label;
    await activityLogRepository.createMany(
      targets.map((target) => ({
        companyId: actor.companyId,
        actorId: actor.id === "system" ? undefined : actor.id,
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
