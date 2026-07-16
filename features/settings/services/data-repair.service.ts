import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { resumeAnalysisRepository } from "@/server/repositories/resume-analysis.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { jobRepository } from "@/server/repositories/job.repository";
import { userRepository } from "@/server/repositories/user.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";

// Same trust boundary as job-mapping.service.ts's Unmapped Jobs tool —
// finding/fixing a record whose companyId isn't a valid ObjectId requires a
// genuine cross-tenant read, so this is platform-admin-only throughout.

export type OrphanedApplicantRow = {
  _id: string;
  name: string;
  email: string;
  status: string;
  malformedFields: string[];
  resolvedCompanyId: string | null;
  resolvedCompanyName: string | null;
  resolvedJobId: string | null;
  resolvedJobTitle: string | null;
};

function isMalformedType(value: unknown): boolean {
  return typeof value === "string";
}

export async function listOrphanedApplicants(): Promise<OrphanedApplicantRow[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const rawRows = await applicantRepository.findOrphaned();

  return Promise.all(
    rawRows.map(async (row) => {
      const malformedFields: string[] = [];
      if (isMalformedType(row.companyId)) malformedFields.push("companyId");
      if (isMalformedType(row.jobId)) malformedFields.push("jobId");
      if (isMalformedType(row.createdAt)) malformedFields.push("createdAt");
      if (isMalformedType(row.updatedAt)) malformedFields.push("updatedAt");

      let resolvedCompanyId: string | null = null;
      let resolvedCompanyName: string | null = null;
      const rawCompanyId = stripQuotes(row.companyId);
      if (Types.ObjectId.isValid(rawCompanyId)) {
        const company = await companyRepository.findById(rawCompanyId);
        if (company) {
          resolvedCompanyId = company._id;
          resolvedCompanyName = company.name;
        }
      }

      let resolvedJobId: string | null = null;
      let resolvedJobTitle: string | null = null;
      const rawJobId = stripQuotes(row.jobId);
      if (Types.ObjectId.isValid(rawJobId)) {
        const job = await jobRepository.findByIdUnscoped(rawJobId);
        if (job) {
          resolvedJobId = job._id;
          resolvedJobTitle = job.title;
        }
      }

      return {
        _id: String(row._id),
        name: (row.name as string | undefined) ?? "(no name)",
        email: (row.email as string | undefined) ?? "(no email)",
        status: (row.status as string | undefined) ?? "unknown",
        malformedFields,
        resolvedCompanyId,
        resolvedCompanyName,
        resolvedJobId,
        resolvedJobTitle,
      };
    }),
  );
}

// Strips a JSON.stringify-style extra quote wrapper — the same external
// writes that store an ObjectId reference as a plain string sometimes wrap
// it in a literal extra pair of quote characters too (e.g. n8n running a
// value through JSON.stringify twice: `'"6a592835ab182f2a1440ed1e"'`,
// 26 characters including the quotes, which correctly fails
// Types.ObjectId.isValid on its own). Applied before validating/casting
// every raw id string in this file, not just dates.
function stripQuotes(value: unknown): string {
  return typeof value === "string" ? value.replace(/^"+|"+$/g, "") : String(value ?? "");
}

// Strips the same wrapper before parsing a date — falls back to "now"
// rather than blocking the whole repair over a cosmetic timestamp.
function cleanDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(stripQuotes(value));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

// Fully automatic, no admin action required — a raw external insert (e.g.
// n8n's own MongoDB node, bypassing this app's Mongoose layer) can leave a
// record's companyId/jobId as plain strings that already correctly identify
// the right company/job, just in the wrong BSON type. When both resolve
// cleanly there's nothing for a human to actually decide, so this repairs
// it immediately. Only genuinely ambiguous cases (a string that isn't a
// valid ObjectId, or references a company/job that no longer exists) are
// left for the platform-admin Settings screen above, which requires a human
// to pick a company because there's nothing here to safely auto-resolve.
// Runs as a system-attributed background job (no requirePlatformAdmin gate —
// there's no human actor to check; same spirit as the AI-call webhook's
// system-attributed activity log writes), triggered via next/server's
// after() from getApplicantsPageData/getApplicantsKanbanData so it never
// adds latency to a real page load and never breaks one if it fails.
export async function autoRepairResolvableOrphanedApplicants(): Promise<{ repaired: number; skipped: number }> {
  await connectDB();
  const rawRows = await applicantRepository.findOrphaned();
  let repaired = 0;
  let skipped = 0;

  for (const row of rawRows) {
    const rawCompanyId = stripQuotes(row.companyId);
    const rawJobId = stripQuotes(row.jobId);
    if (!Types.ObjectId.isValid(rawCompanyId) || !Types.ObjectId.isValid(rawJobId)) {
      skipped++;
      continue;
    }

    const [company, job] = await Promise.all([
      companyRepository.findById(rawCompanyId),
      jobRepository.findByIdUnscoped(rawJobId),
    ]);
    if (!company || !job) {
      skipped++;
      continue;
    }

    const applicantId = String(row._id);
    const createdAt = cleanDate(row.createdAt);
    await applicantRepository.repairTypes(applicantId, {
      companyId: new Types.ObjectId(rawCompanyId),
      jobId: new Types.ObjectId(rawJobId),
      createdAt,
      updatedAt: cleanDate(row.updatedAt),
      appliedAt: row.appliedAt ? cleanDate(row.appliedAt) : createdAt,
    });

    await activityLogRepository.create({
      companyId: rawCompanyId,
      actorName: "Auto-Repair",
      action: "applicant.repaired",
      entityType: "applicant",
      entityId: applicantId,
      message: `Automatically repaired an orphaned applicant record (${(row.name as string) ?? "unknown"}) for ${company.name}`,
    });
    repaired++;
  }

  return { repaired, skipped };
}

export async function repairOrphanedApplicant(applicantId: string, companyId: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const company = await companyRepository.findById(companyId);
  if (!company) throw new Error("Company not found");

  const raw = await applicantRepository.findRawById(applicantId);
  if (!raw) throw new Error("Applicant record not found");

  const rawJobId = stripQuotes(raw.jobId);
  if (!Types.ObjectId.isValid(rawJobId)) {
    throw new Error("This record's job reference is invalid — it can't be auto-repaired");
  }
  const job = await jobRepository.findByIdUnscoped(rawJobId);
  if (!job) {
    throw new Error("This record's linked job no longer exists — it can't be auto-repaired");
  }

  const createdAt = cleanDate(raw.createdAt);
  await applicantRepository.repairTypes(applicantId, {
    companyId: new Types.ObjectId(companyId),
    jobId: new Types.ObjectId(rawJobId),
    createdAt,
    updatedAt: cleanDate(raw.updatedAt),
    appliedAt: raw.appliedAt ? cleanDate(raw.appliedAt) : createdAt,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "applicant.repaired",
    entityType: "applicant",
    entityId: applicantId,
    message: `${actor.name} repaired an orphaned applicant record (${(raw.name as string) ?? "unknown"}) and assigned it to ${company.name}`,
  });
}

// Same automatic, zero-human-action repair as autoRepairResolvableOrphanedApplicants
// above, for ResumeAnalysis. companyId/jobId are deliberately derived from
// the linked Applicant (the source of truth for "which company/job"),
// never trusted from the ResumeAnalysis record's own possibly-corrupted
// fields — this also guarantees the analysis ends up tenant-consistent
// with its applicant. If the linked applicant is itself still orphaned
// (unresolved), this is skipped for now — it'll resolve on a later pass
// once that applicant gets fixed first.
export async function autoRepairResolvableOrphanedResumeAnalyses(): Promise<{ repaired: number; skipped: number }> {
  await connectDB();
  const rawRows = await resumeAnalysisRepository.findOrphaned();
  let repaired = 0;
  let skipped = 0;

  for (const row of rawRows) {
    const rawApplicantId = stripQuotes(row.applicantId);
    if (!Types.ObjectId.isValid(rawApplicantId)) {
      skipped++;
      continue;
    }

    const applicant = await applicantRepository.findRawById(rawApplicantId);
    const applicantCompanyId = applicant?.companyId;
    const applicantJobId = applicant?.jobId;
    if (!(applicantCompanyId instanceof Types.ObjectId) || !(applicantJobId instanceof Types.ObjectId)) {
      skipped++;
      continue;
    }

    const analysisId = String(row._id);
    await resumeAnalysisRepository.repairTypes(analysisId, {
      companyId: applicantCompanyId,
      applicantId: new Types.ObjectId(rawApplicantId),
      jobId: applicantJobId,
      createdAt: cleanDate(row.createdAt),
      updatedAt: cleanDate(row.updatedAt),
    });

    await activityLogRepository.create({
      companyId: String(applicantCompanyId),
      actorName: "Auto-Repair",
      action: "applicant.repaired",
      entityType: "applicant",
      entityId: rawApplicantId,
      message: `Automatically repaired an orphaned resume analysis record for applicant ${(applicant?.name as string) ?? rawApplicantId}`,
    });
    repaired++;
  }

  return { repaired, skipped };
}

// Same pattern again for Notification. companyId is derived from the
// linked User (the source of truth for "which company"), never trusted
// from the notification's own possibly-corrupted companyId field.
export async function autoRepairResolvableOrphanedNotifications(): Promise<{ repaired: number; skipped: number }> {
  await connectDB();
  const rawRows = await notificationRepository.findOrphaned();
  let repaired = 0;
  let skipped = 0;

  for (const row of rawRows) {
    const rawUserId = stripQuotes(row.userId);
    if (!Types.ObjectId.isValid(rawUserId)) {
      skipped++;
      continue;
    }

    const user = await userRepository.findByIdUnscoped(rawUserId);
    if (!user || !user.companyId || !Types.ObjectId.isValid(user.companyId)) {
      skipped++;
      continue;
    }

    const notificationId = String(row._id);
    await notificationRepository.repairTypes(notificationId, {
      userId: new Types.ObjectId(rawUserId),
      companyId: new Types.ObjectId(user.companyId),
      createdAt: cleanDate(row.createdAt),
      updatedAt: cleanDate(row.updatedAt),
    });

    await activityLogRepository.create({
      companyId: user.companyId,
      actorName: "Auto-Repair",
      action: "notification.repaired",
      entityType: "user",
      entityId: rawUserId,
      message: `Automatically repaired an orphaned notification record (id ${notificationId})`,
    });
    repaired++;
  }

  return { repaired, skipped };
}
