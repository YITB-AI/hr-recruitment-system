import { connectDB } from "@/server/db/connect";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { ScheduleInterviewInput } from "@/validators/interview";

export async function listInterviews() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return interviewRepository.findAll(companyId);
}

export async function listInterviewers() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return userRepository.findAll(companyId);
}

export async function scheduleInterview(input: ScheduleInterviewInput) {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "interview.schedule");

  const applicant = await applicantRepository.findById(actor.companyId, input.applicantId);
  if (!applicant) throw new Error("Applicant not found");
  if (!applicant.jobId) throw new Error("Applicant has no linked job");

  const scheduledAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date/time");

  const interview = await interviewRepository.create(actor.companyId, {
    applicantId: input.applicantId,
    jobId: applicant.jobId._id,
    interviewerIds: input.interviewerIds,
    type: input.type,
    scheduledAt,
    durationMinutes: input.durationMinutes,
    meetingLink: input.meetingLink || undefined,
    notes: input.notes || undefined,
  });

  await applicantRepository.updateStatus(actor.companyId, input.applicantId, "interview");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "interview.scheduled",
    entityType: "interview",
    entityId: interview._id,
    message: `Interview scheduled for ${applicant.name} — ${applicant.jobId.title}`,
  });

  return interview;
}
