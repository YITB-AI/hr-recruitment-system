import { applicantRepository } from "@/server/repositories/applicant.repository";
import { applicantFollowupRepository, type ApplicantFollowupRow } from "@/server/repositories/applicant-followup.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { isValidStatusKey } from "@/features/settings/services/status-management.service";
import { changeApplicantStatus } from "@/features/applicants/services/applicant.service";
import { FOLLOWUP_OUTCOME_LABELS, type FollowupOutcome } from "@/constants/followup";
import type { SessionUser } from "@/types/user";
import type { AiCallWebhookInput } from "@/validators/ai-call-webhook";

type CompletedEvent = Extract<AiCallWebhookInput, { event: "completed" }>;

// This runs as trusted system code from inside app/api/webhooks/ai-call —
// there's no real session (n8n has no cookie), so it can't call
// getCurrentUser()/requireRole() the normal way. The webhook route's
// shared-secret check IS the authorization boundary; everything below
// operates as a synthetic system actor, same spirit as getSystemUser() in
// lib/current-user.ts (not a security boundary of its own, just actor
// attribution for the audit log and for changeApplicantStatus's internal
// requireRole call, which always passes for role "admin").
function systemActorFor(companyId: string): SessionUser {
  return {
    id: "system",
    companyId,
    name: "AI Call Webhook",
    email: "system@internal",
    role: "admin",
    avatarUrl: null,
    isPlatformAdmin: false,
    impersonatedBy: null,
  };
}

const NOTIFY_ROLES = ["admin", "hr", "recruiter"] as const;

async function notifyStaffForReview(companyId: string, title: string, message: string): Promise<void> {
  const recipients = await userRepository.findByRoles(companyId, [...NOTIFY_ROLES]);
  if (recipients.length === 0) return;
  await notificationRepository.createMany(
    recipients.map((recipient) => ({ companyId, userId: recipient._id, title, message })),
  );
}

async function logCallEvent(companyId: string, applicantId: string, action: string, message: string): Promise<void> {
  await activityLogRepository.create({
    companyId,
    actorName: "AI Call Webhook",
    action,
    entityType: "applicant",
    entityId: applicantId,
    message,
  });
}

export async function handleCallStarted(followup: ApplicantFollowupRow): Promise<void> {
  const applied = await applicantFollowupRepository.applyEvent(followup._id, {
    status: "in_progress",
    startedAt: new Date(),
  });
  if (!applied) return; // already terminal — a late/duplicate "started" is a no-op

  await logCallEvent(followup.companyId, followup.applicantId, "applicant.ai_call_in_progress", "AI call started");
}

export async function handleCallFailed(followup: ApplicantFollowupRow, error?: string): Promise<void> {
  const applied = await applicantFollowupRepository.applyEvent(followup._id, {
    status: "failed",
    error,
    completedAt: new Date(),
  });
  if (!applied) return;

  await logCallEvent(
    followup.companyId,
    followup.applicantId,
    "applicant.ai_call_failed",
    `AI call could not be completed${error ? `: ${error}` : ""}`,
  );
}

type OutcomeContext = {
  followup: ApplicantFollowupRow;
  applicantName: string;
  actor: SessionUser;
  body: CompletedEvent;
};

async function tryStatusChangeOrNotify(
  ctx: OutcomeContext,
  targetStatus: string,
  title: string,
  fallbackMessage: string,
): Promise<void> {
  const canApply = await isValidStatusKey(ctx.followup.companyId, "applicant", targetStatus);
  if (canApply) {
    await changeApplicantStatus(ctx.followup.applicantId, targetStatus, ctx.actor).catch((error) => {
      console.error("Failed to apply AI-call status change:", error);
    });
    return;
  }
  // Don't guess at a status that isn't configured for this company — flag
  // it for a human instead, same fail-closed spirit as this project's
  // other "don't auto-apply an assumption" cases.
  await notifyStaffForReview(ctx.followup.companyId, title, fallbackMessage);
}

// outcome -> side effect. Matches this codebase's existing flat-lookup-table
// idiom (WEBHOOK_ENV_VAR, ROLE_PERMISSIONS). Every branch's ActivityLog
// entry is written once, centrally, by handleCallCompleted below — these
// handlers only own the status-change/notification side effects.
const OUTCOME_HANDLERS: Record<FollowupOutcome, (ctx: OutcomeContext) => Promise<void>> = {
  interview_scheduled: async (ctx) => {
    // Only the status flips automatically — an actual Interview document
    // still needs a human to pick an interviewer/duration via the real
    // scheduling UI (scheduleInterview() requires both and an AI call has
    // no way to supply either).
    await changeApplicantStatus(ctx.followup.applicantId, "interview", ctx.actor).catch((error) => {
      console.error("Failed to apply AI-call status change:", error);
    });
    const when = ctx.body.proposedInterviewAt ? ` around ${new Date(ctx.body.proposedInterviewAt).toLocaleString()}` : "";
    await notifyStaffForReview(
      ctx.followup.companyId,
      "AI call: interview requested",
      `${ctx.applicantName} agreed to an interview${when} — schedule it from the Interviews page.`,
    );
  },
  rejected: async (ctx) => {
    await changeApplicantStatus(ctx.followup.applicantId, "rejected", ctx.actor).catch((error) => {
      console.error("Failed to apply AI-call status change:", error);
    });
  },
  withdrawn: (ctx) =>
    tryStatusChangeOrNotify(
      ctx,
      "withdrawn",
      "AI call: applicant withdrew",
      `${ctx.applicantName} withdrew their application during the AI call, but no "Withdrawn" status is configured for your company. Add one in Settings > Statuses, or update their status manually.`,
    ),
  not_interested: (ctx) =>
    tryStatusChangeOrNotify(
      ctx,
      "withdrawn",
      "AI call: applicant not interested",
      `${ctx.applicantName} said they're no longer interested, but no "Withdrawn" status is configured for your company. Add one in Settings > Statuses, or update their status manually.`,
    ),
  // Deliberately never auto-applied, even if a "hired" status key exists —
  // hiring is a terminal, high-stakes decision that should always go
  // through a human review step rather than being fully automated from a
  // phone call outcome.
  accepted: async (ctx) => {
    await notifyStaffForReview(
      ctx.followup.companyId,
      "AI call: applicant accepted",
      `${ctx.applicantName} indicated acceptance during the AI call — please review and update their status.`,
    );
  },
  // No status change, no notification — just "keep the follow-up updated"
  // without over-acting. The centralized ActivityLog entry in
  // handleCallCompleted is enough to surface these in the timeline.
  reschedule_requested: async () => {},
  callback_requested: async () => {},
  no_answer: async () => {},
  voicemail: async () => {},
  other: async () => {},
};

export async function handleCallCompleted(followup: ApplicantFollowupRow, body: CompletedEvent): Promise<void> {
  const applied = await applicantFollowupRepository.applyEvent(followup._id, {
    status: "completed",
    outcome: body.outcome,
    transcript: body.transcript,
    summary: body.summary,
    recordingUrl: body.recordingUrl,
    proposedInterviewAt: body.proposedInterviewAt ? new Date(body.proposedInterviewAt) : undefined,
    completedAt: new Date(),
  });
  if (!applied) return; // already terminal — duplicate/late "completed" is a no-op

  const applicant = await applicantRepository.findById(followup.companyId, followup.applicantId);
  const applicantName = applicant?.name ?? "the applicant";
  const actor = systemActorFor(followup.companyId);

  await OUTCOME_HANDLERS[body.outcome]({ followup, applicantName, actor, body });

  await logCallEvent(
    followup.companyId,
    followup.applicantId,
    `applicant.ai_call_${body.outcome}`,
    `AI call with ${applicantName} ended: ${FOLLOWUP_OUTCOME_LABELS[body.outcome]}`,
  );
}
