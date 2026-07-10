import { connectDB } from "@/server/db/connect";
import { applicantRepository, type ApplicantDetailRow } from "@/server/repositories/applicant.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { resumeAnalysisRepository, type ResumeAnalysisRow } from "@/server/repositories/resume-analysis.repository";
import { getCurrentUser } from "@/lib/current-user";
import type { ApplicantStatus } from "@/constants/applicant-status";

export async function listApplicants() {
  await connectDB();
  return applicantRepository.findAll();
}

export async function getApplicantDetail(id: string): Promise<ApplicantDetailRow | null> {
  await connectDB();
  return applicantRepository.findById(id);
}

export async function getApplicantResumeAnalysis(id: string): Promise<ResumeAnalysisRow | null> {
  await connectDB();
  return resumeAnalysisRepository.findByApplicantId(id);
}

async function changeStatus(id: string, status: ApplicantStatus, actionLabel: string) {
  await connectDB();
  const updated = await applicantRepository.updateStatus(id, status);
  if (!updated) throw new Error("Applicant not found");

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: `applicant.${status}`,
    entityType: "applicant",
    entityId: id,
    message: `${updated.name} ${actionLabel}${updated.jobId ? ` for ${updated.jobId.title}` : ""}`,
  });

  return updated;
}

export function shortlistApplicant(id: string) {
  return changeStatus(id, "shortlisted", "shortlisted");
}

export function rejectApplicant(id: string) {
  return changeStatus(id, "rejected", "rejected");
}
