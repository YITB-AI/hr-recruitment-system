import { connectDB } from "@/server/db/connect";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { ScheduleInterviewInput, RescheduleInterviewInput } from "@/validators/interview";

export async function listInterviews() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return interviewRepository.findAll(companyId);
}

export async function deleteInterview(interviewId: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "interview.delete");

  const interview = await interviewRepository.findById(actor.companyId, interviewId);
  if (!interview) throw new Error("Interview not found");

  await interviewRepository.softDelete(actor.companyId, interviewId);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "interview.deleted",
    entityType: "interview",
    entityId: interviewId,
    message: `${actor.name} deleted the interview for ${interview.applicantId?.name ?? "an applicant"}`,
  });
}

export async function listInterviewActivity(interviewId: string) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return activityLogRepository.findByEntity(companyId, "interview", interviewId, 30);
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

// The old interview is marked "rescheduled" (superseded, not edited in
// place) and a brand new row is created for the new date/time — preserves
// history instead of overwriting scheduledAt, matching this codebase's
// append-only audit posture and the fact that "rescheduled" already exists
// as a distinct status value from "cancelled".
export async function rescheduleInterview(input: RescheduleInterviewInput) {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "interview.schedule");

  const oldInterview = await interviewRepository.findById(actor.companyId, input.oldInterviewId);
  if (!oldInterview) throw new Error("Interview not found");
  if (!oldInterview.applicantId || oldInterview.applicantId._id !== input.applicantId) {
    throw new Error("Interview does not belong to this applicant");
  }

  const applicant = await applicantRepository.findById(actor.companyId, input.applicantId);
  if (!applicant) throw new Error("Applicant not found");
  if (!applicant.jobId) throw new Error("Applicant has no linked job");

  const scheduledAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date/time");

  await interviewRepository.update(actor.companyId, input.oldInterviewId, { status: "rescheduled" });

  const newInterview = await interviewRepository.create(actor.companyId, {
    applicantId: input.applicantId,
    jobId: applicant.jobId._id,
    interviewerIds: input.interviewerIds,
    type: input.type,
    scheduledAt,
    durationMinutes: input.durationMinutes,
    meetingLink: input.meetingLink || undefined,
    notes: input.notes || undefined,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "interview.rescheduled",
    entityType: "interview",
    entityId: input.oldInterviewId,
    message: `Interview for ${applicant.name} rescheduled to ${scheduledAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`,
  });
  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "interview.scheduled",
    entityType: "interview",
    entityId: newInterview._id,
    message: `Interview scheduled for ${applicant.name} — ${applicant.jobId.title} (rescheduled from a prior interview)`,
  });

  return newInterview;
}
