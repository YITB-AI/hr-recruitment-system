import { after } from "next/server";
import { connectDB } from "@/server/db/connect";
import {
  applicantRepository,
  type ApplicantDetailRow,
  type ApplicantListFilters,
  type ApplicantKanbanFilters,
} from "@/server/repositories/applicant.repository";
import {
  autoRepairResolvableOrphanedApplicants,
  autoRepairResolvableOrphanedResumeAnalyses,
} from "@/features/settings/services/data-repair.service";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { resumeAnalysisRepository, type ResumeAnalysisRow } from "@/server/repositories/resume-analysis.repository";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";
import { emailLogRepository, type EmailLogRow } from "@/server/repositories/email-log.repository";
import { applicantFollowupRepository, type ApplicantFollowupRow } from "@/server/repositories/applicant-followup.repository";
import { noteRepository, type NoteRow } from "@/server/repositories/note.repository";
import { FOLLOWUP_TYPE_LABELS, FOLLOWUP_OUTCOME_LABELS } from "@/constants/followup";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { statusRepository } from "@/server/repositories/status.repository";
import type { SessionUser } from "@/types/user";

// Fire-and-forget, after the response has gone out — self-heals any
// orphaned records left by a raw external insert (see
// data-repair.service.ts) with zero human action needed. Never awaited and
// never allowed to throw, so a repair failure can't break or slow down a
// real page load; the next page load just tries again.
function triggerAutoRepairInBackground(): void {
  after(async () => {
    try {
      // Applicants first — ResumeAnalysis repair derives companyId/jobId
      // from the linked Applicant, so an applicant that's still orphaned
      // itself needs fixing first for its analysis to resolve on this pass.
      await autoRepairResolvableOrphanedApplicants();
      await autoRepairResolvableOrphanedResumeAnalyses();
    } catch (error) {
      console.error("Auto-repair of orphaned applicant/resume-analysis records failed:", error);
    }
  });
}

export async function getApplicantsPageData(filters: ApplicantListFilters) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  triggerAutoRepairInBackground();
  return applicantRepository.findAllPaginated(companyId, filters);
}

export async function getApplicantsKanbanData(filters: ApplicantKanbanFilters) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  triggerAutoRepairInBackground();
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

// Most recent outbound attempt across every channel — powers the small
// follow-up-status indicator on the applicant detail page (e.g. "AI Call in
// progress...", "Email sent 2h ago").
export async function getApplicantLatestFollowup(id: string): Promise<ApplicantFollowupRow | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  const [latest] = await applicantFollowupRepository.findByApplicantId(companyId, id, 1);
  return latest ?? null;
}

export type ApplicantTimelineEntry =
  | { kind: "activity"; _id: string; message: string; actorName: string | null; createdAt: Date }
  | { kind: "email"; _id: string; message: string; actorName: string | null; createdAt: Date; email: EmailLogRow }
  | {
      kind: "followup";
      _id: string;
      message: string;
      actorName: string | null;
      createdAt: Date;
      followup: ApplicantFollowupRow;
    }
  | { kind: "note"; _id: string; message: string; actorName: string | null; createdAt: Date; note: NoteRow };

// A call-type row's message depends on where it is in its lifecycle
// (pending -> in_progress -> completed/failed, see call-outcome.service.ts)
// — email/sms/whatsapp rows never leave pending/sent/failed since their
// result is known synchronously.
function followupMessage(row: ApplicantFollowupRow): string {
  const label = FOLLOWUP_TYPE_LABELS[row.type];
  if (row.status === "failed") return `${label} attempt failed`;
  if (row.status === "in_progress") return `${label} in progress`;
  if (row.status === "completed" && row.outcome) return `${label} ended: ${FOLLOWUP_OUTCOME_LABELS[row.outcome]}`;
  return `${label} requested`;
}

export async function getApplicantHistory(id: string): Promise<ApplicantTimelineEntry[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  const [activity, emails, followups, notes] = await Promise.all([
    activityLogRepository.findByEntity(companyId, "applicant", id, 50),
    emailLogRepository.findByApplicantId(companyId, id, 50),
    applicantFollowupRepository.findByApplicantId(companyId, id, 50),
    noteRepository.findByApplicantId(companyId, id, 50),
  ]);

  const activityEntries: ApplicantTimelineEntry[] = activity.map((row) => ({
    kind: "activity",
    _id: row._id,
    message: row.message,
    actorName: row.actorName,
    createdAt: row.createdAt,
  }));
  const emailEntries: ApplicantTimelineEntry[] = emails.map((row) => ({
    kind: "email",
    _id: row._id,
    message:
      row.status === "sent"
        ? `${row.subject} email sent to ${row.to}`
        : `Failed to send "${row.subject}" email to ${row.to}`,
    actorName: row.userName,
    createdAt: row.createdAt,
    email: row,
  }));
  // "email" is intentionally excluded here — EmailLog above already
  // represents every email with richer detail (subject/template); showing
  // both would duplicate the same event twice in the timeline.
  const followupEntries: ApplicantTimelineEntry[] = followups
    .filter((row) => row.type !== "email")
    .map((row) => ({
      kind: "followup",
      _id: row._id,
      message: followupMessage(row),
      actorName: row.createdByName,
      createdAt: row.createdAt,
      followup: row,
    }));
  const noteEntries: ApplicantTimelineEntry[] = notes.map((row) => ({
    kind: "note",
    _id: row._id,
    message: `${row.authorName} added a note`,
    actorName: row.authorName,
    createdAt: row.createdAt,
    note: row,
  }));

  return [...activityEntries, ...emailEntries, ...followupEntries, ...noteEntries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export type CommunicationEntry =
  | { channel: "email"; _id: string; createdAt: Date; email: EmailLogRow }
  | { channel: "call" | "sms" | "whatsapp"; _id: string; createdAt: Date; followup: ApplicantFollowupRow };

// The richer, per-channel-detail companion to getApplicantHistory's terse
// cross-entity feed above — full email subject/body-template, full call
// transcript/summary/recording, one merged and sorted list. No new storage:
// reads the same EmailLog/ApplicantFollowup rows the timeline already uses.
export async function getApplicantCommunicationHistory(id: string): Promise<CommunicationEntry[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  const [emails, followups] = await Promise.all([
    emailLogRepository.findByApplicantId(companyId, id, 50),
    applicantFollowupRepository.findByApplicantId(companyId, id, 50),
  ]);

  const emailEntries: CommunicationEntry[] = emails.map((row) => ({
    channel: "email",
    _id: row._id,
    createdAt: row.createdAt,
    email: row,
  }));
  const followupEntries: CommunicationEntry[] = followups
    .filter((row): row is ApplicantFollowupRow & { type: "call" | "sms" | "whatsapp" } => row.type !== "email")
    .map((row) => ({
      channel: row.type,
      _id: row._id,
      createdAt: row.createdAt,
      followup: row,
    }));

  return [...emailEntries, ...followupEntries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// actorOverride lets trusted system code (the AI-call outcome handler,
// which runs from the n8n webhook route with no real session — see
// call-outcome.service.ts) apply a status change under a synthetic actor
// instead of getCurrentUser(), which would try to read a session cookie
// that doesn't exist there. Every normal human-triggered caller omits it.
export async function changeApplicantStatus(
  id: string,
  status: string,
  actorOverride?: SessionUser,
): Promise<ApplicantDetailRow> {
  await connectDB();
  const actor = actorOverride ?? (await getCurrentUser());
  requireRole(actor, "applicant.status.change");

  const statusRow = await statusRepository.findByKey(actor.companyId, "applicant", status);
  if (!statusRow || !statusRow.isActive) throw new Error("Invalid or inactive status");

  const updated = await applicantRepository.updateStatus(actor.companyId, id, status);
  if (!updated) throw new Error("Applicant not found");

  const label = statusRow.name;
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

export async function bulkChangeApplicantStatus(ids: string[], status: string): Promise<{ successCount: number }> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.status.change");

  const statusRow = await statusRepository.findByKey(actor.companyId, "applicant", status);
  if (!statusRow || !statusRow.isActive) throw new Error("Invalid or inactive status");

  const targets = await applicantRepository.findMinimalByIds(actor.companyId, ids);
  const successCount = await applicantRepository.updateStatusMany(actor.companyId, ids, status);

  if (targets.length > 0) {
    const label = statusRow.name;
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
