import { connectDB } from "@/server/db/connect";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { applicantFollowupRepository } from "@/server/repositories/applicant-followup.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { triggerWebhook } from "@/lib/webhook";
import type { RequestAiCallInput } from "@/validators/ai-call";

export type AiCallResult = { success: true } | { success: false; error: string };

const DUPLICATE_REQUEST_WINDOW_MS = 60 * 1000;

function summarizeResponse(data: unknown): string | undefined {
  if (data === null || data === undefined) return undefined;
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return text.slice(0, 500);
}

export async function requestAiCall(input: RequestAiCallInput): Promise<AiCallResult> {
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.notify");
  await connectDB();

  const applicant = await applicantRepository.findById(actor.companyId, input.applicantId);
  if (!applicant) return { success: false, error: "Applicant not found" };

  if (
    await applicantFollowupRepository.existsRecentActive(
      actor.companyId,
      input.applicantId,
      "call",
      DUPLICATE_REQUEST_WINDOW_MS,
    )
  ) {
    return { success: false, error: "An AI call was already requested for this applicant moments ago" };
  }

  const scheduledAt = new Date(`${input.callDate}T${input.callTime}:00`);
  if (Number.isNaN(scheduledAt.getTime())) return { success: false, error: "Invalid call date/time" };

  const interviewerNames = input.interviewerNames
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (interviewerNames.length === 0) return { success: false, error: "At least one interviewer name is required" };

  const company = await companyRepository.findById(actor.companyId);
  const retryCount = await applicantFollowupRepository.countPriorAttempts(actor.companyId, input.applicantId, "call");

  // Created before the outbound trigger (not after) so its _id can be
  // included in the payload — n8n echoes followupId back in every
  // started/completed/failed callback to app/api/webhooks/ai-call, which is
  // how the app knows which row a later callback refers to.
  const followup = await applicantFollowupRepository.create({
    companyId: actor.companyId,
    applicantId: input.applicantId,
    type: "call",
    source: "ai-call",
    status: "pending",
    message: input.message,
    requestedAt: scheduledAt,
    interviewerNames,
    meetingLink: input.meetingLink,
    retryCount,
    createdBy: actor.id === "system" ? undefined : actor.id,
    createdByName: actor.name,
  });

  const result = await triggerWebhook("ai-call", {
    followupId: followup._id,
    applicantId: applicant._id,
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    jobTitle: input.jobTitle || null,
    company: company?.name ?? null,
    date: input.callDate,
    time: input.callTime,
    message: input.message,
    interviewerNames,
    meetingLink: input.meetingLink,
    userId: actor.id === "system" ? null : actor.id,
    createdBy: actor.name,
  });

  // The row already exists as "pending" — patch it rather than creating a
  // second row. Only a trigger failure needs to move it here; on success it
  // stays "pending" until the webhook callback reports "started"/"completed"
  // (there's no callback-independent way to know the call actually happened).
  await applicantFollowupRepository.applyEvent(followup._id, {
    status: result.ok ? undefined : "failed",
    response: result.ok ? summarizeResponse(result.data) : undefined,
    error: result.ok ? undefined : result.error,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "applicant.ai_call_requested",
    entityType: "applicant",
    entityId: input.applicantId,
    message: result.ok
      ? `${actor.name} requested an AI call to ${applicant.name}`
      : `Failed to request an AI call to ${applicant.name}: ${result.error}`,
  });

  if (!result.ok) return { success: false, error: result.error };
  return { success: true };
}
