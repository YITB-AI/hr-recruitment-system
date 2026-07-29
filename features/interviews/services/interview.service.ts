import { connectDB } from "@/server/db/connect";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { notifyStaffForReview } from "@/lib/staff-notify";
import { checkConflicts, createCalendarEventsForInterview, deleteCalendarEventsForInterview } from "@/features/calendar/services/calendar.service";
import type { ScheduleInterviewInput, RescheduleInterviewInput } from "@/validators/interview";
import type { InterviewType } from "@/constants/interview";
import type { SessionUser } from "@/types/user";

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
  // Best-effort — a calendar API failure must never block the delete itself.
  if (interview.calendarEvents.length > 0) {
    await deleteCalendarEventsForInterview(interview.calendarEvents).catch((error) => {
      console.error("Failed to delete calendar events for a deleted interview:", error);
    });
  }

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
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

  // Warn, don't hard-block: third-party free/busy data can be stale,
  // privacy-restricted, or just an "OOO" placeholder, and an interviewer
  // with no connected calendar would otherwise produce a false "no
  // conflict" signal either way — a hard block on data this unreliable is
  // worse than a dismissible, logged warning.
  const conflictingUserIds = await checkConflicts(input.interviewerIds, scheduledAt, input.durationMinutes).catch((error) => {
    console.error("Failed to check calendar conflicts:", error);
    return [];
  });
  const hadConflictWarning = conflictingUserIds.length > 0;

  const interview = await interviewRepository.create(actor.companyId, {
    applicantId: input.applicantId,
    jobId: applicant.jobId._id,
    interviewerIds: input.interviewerIds,
    type: input.type,
    scheduledAt,
    durationMinutes: input.durationMinutes,
    meetingLink: input.meetingLink || undefined,
    notes: input.notes || undefined,
    hadConflictWarning,
  });

  await applicantRepository.updateStatus(actor.companyId, input.applicantId, "interview");

  // Best-effort — a calendar API failure must never fail the schedule itself.
  const calendarEvents = await createCalendarEventsForInterview({
    interviewerIds: input.interviewerIds,
    summary: `Interview: ${applicant.name} — ${applicant.jobId.title}`,
    description: input.notes || undefined,
    scheduledAt,
    durationMinutes: input.durationMinutes,
  }).catch((error) => {
    console.error("Failed to create calendar events for a scheduled interview:", error);
    return [];
  });
  if (calendarEvents.length > 0) {
    await interviewRepository.update(actor.companyId, String(interview._id), { calendarEvents });
  }

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "interview.scheduled",
    entityType: "interview",
    entityId: interview._id,
    message: `Interview scheduled for ${applicant.name} — ${applicant.jobId.title}`,
  });

  await notifyStaffForReview(
    actor.companyId,
    "Interview scheduled",
    `${applicant.name}'s interview for ${applicant.jobId.title} has been scheduled.`,
    { type: "interview", priority: "normal", entityType: "interview", entityId: String(interview._id) },
  );

  if (hadConflictWarning) {
    await notifyStaffForReview(
      actor.companyId,
      "Interview scheduled with a calendar conflict",
      `${applicant.name}'s interview for ${applicant.jobId.title} was scheduled, but at least one interviewer has a conflicting calendar event at that time — review if needed.`,
      { type: "interview", priority: "high", entityType: "interview", entityId: String(interview._id) },
    );
  }

  return interview;
}

type RescheduleCoreInput = {
  oldInterviewId: string;
  applicantId: string;
  interviewerIds: string[];
  type: InterviewType;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink?: string;
  notes?: string;
  // Only true for the AI-call-driven caller (call-outcome.service.ts) —
  // changes the second activity-log entry's wording so it's clear the move
  // wasn't a human action.
  systemInitiated?: boolean;
};

// The old interview is marked "rescheduled" (superseded, not edited in
// place) and a brand new row is created for the new date/time — preserves
// history instead of overwriting scheduledAt, matching this codebase's
// append-only audit posture and the fact that "rescheduled" already exists
// as a distinct status value from "cancelled". Shared by the human-facing
// rescheduleInterview below (via its Zod-validated action) and by
// call-outcome.service.ts's AI-driven reschedule — the latter already has a
// real Date (from the webhook's proposedInterviewAt), not a date/time string
// pair, so it calls this directly rather than going through a string round
// trip that could introduce a timezone bug.
export async function rescheduleInterviewCore(actor: SessionUser, input: RescheduleCoreInput) {
  requireRole(actor, "interview.schedule");

  const oldInterview = await interviewRepository.findById(actor.companyId, input.oldInterviewId);
  if (!oldInterview) throw new Error("Interview not found");
  if (!oldInterview.applicantId || oldInterview.applicantId._id !== input.applicantId) {
    throw new Error("Interview does not belong to this applicant");
  }

  const applicant = await applicantRepository.findById(actor.companyId, input.applicantId);
  if (!applicant) throw new Error("Applicant not found");
  if (!applicant.jobId) throw new Error("Applicant has no linked job");

  await interviewRepository.update(actor.companyId, input.oldInterviewId, { status: "rescheduled" });
  // Best-effort, deliberately delete + recreate (not "move") — consistent
  // with the old interview being genuinely superseded, not edited.
  if (oldInterview.calendarEvents.length > 0) {
    await deleteCalendarEventsForInterview(oldInterview.calendarEvents).catch((error) => {
      console.error("Failed to delete the old interview's calendar events during reschedule:", error);
    });
  }

  const newInterview = await interviewRepository.create(actor.companyId, {
    applicantId: input.applicantId,
    jobId: applicant.jobId._id,
    interviewerIds: input.interviewerIds,
    type: input.type,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
    meetingLink: input.meetingLink || undefined,
    notes: input.notes || undefined,
  });

  const newCalendarEvents = await createCalendarEventsForInterview({
    interviewerIds: input.interviewerIds,
    summary: `Interview: ${applicant.name} — ${applicant.jobId.title}`,
    description: input.notes || undefined,
    scheduledAt: input.scheduledAt,
    durationMinutes: input.durationMinutes,
  }).catch((error) => {
    console.error("Failed to create calendar events for a rescheduled interview:", error);
    return [];
  });
  if (newCalendarEvents.length > 0) {
    await interviewRepository.update(actor.companyId, String(newInterview._id), { calendarEvents: newCalendarEvents });
  }

  const suffix = input.systemInitiated ? " (auto-rescheduled based on an AI call)" : " (rescheduled from a prior interview)";

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "interview.rescheduled",
    entityType: "interview",
    entityId: input.oldInterviewId,
    message: `Interview for ${applicant.name} rescheduled to ${input.scheduledAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`,
  });
  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "interview.scheduled",
    entityType: "interview",
    entityId: newInterview._id,
    message: `Interview scheduled for ${applicant.name} — ${applicant.jobId.title}${suffix}`,
  });

  return newInterview;
}

export async function rescheduleInterview(input: RescheduleInterviewInput) {
  await connectDB();
  const actor = await getCurrentUser();

  const scheduledAt = new Date(`${input.date}T${input.time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date/time");

  return rescheduleInterviewCore(actor, { ...input, scheduledAt });
}
