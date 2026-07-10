import { connectDB } from "@/server/db/connect";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { getCurrentUser } from "@/lib/current-user";
import type { ScheduleInterviewInput } from "@/validators/interview";

export async function listInterviews() {
  await connectDB();
  return interviewRepository.findAll();
}

export async function listInterviewers() {
  await connectDB();
  return userRepository.findAll();
}

export async function scheduleInterview(input: ScheduleInterviewInput) {
  await connectDB();

  const applicant = await applicantRepository.findById(input.applicantId);
  if (!applicant) throw new Error("Applicant not found");
  if (!applicant.jobId) throw new Error("Applicant has no linked job");

  const scheduledAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date/time");

  const interview = await interviewRepository.create({
    applicantId: input.applicantId,
    jobId: applicant.jobId._id,
    interviewerIds: input.interviewerIds,
    type: input.type,
    scheduledAt,
    durationMinutes: input.durationMinutes,
    meetingLink: input.meetingLink || undefined,
    notes: input.notes || undefined,
  });

  await applicantRepository.updateStatus(input.applicantId, "interview");

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "interview.scheduled",
    entityType: "interview",
    entityId: interview._id,
    message: `Interview scheduled for ${applicant.name} — ${applicant.jobId.title}`,
  });

  return interview;
}
