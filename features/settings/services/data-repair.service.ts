import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { applicantRepository } from "@/server/repositories/applicant.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { jobRepository } from "@/server/repositories/job.repository";
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
      const rawCompanyId = String(row.companyId ?? "");
      if (Types.ObjectId.isValid(rawCompanyId)) {
        const company = await companyRepository.findById(rawCompanyId);
        if (company) {
          resolvedCompanyId = company._id;
          resolvedCompanyName = company.name;
        }
      }

      let resolvedJobId: string | null = null;
      let resolvedJobTitle: string | null = null;
      const rawJobId = String(row.jobId ?? "");
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

// Strips a JSON.stringify-style extra quote wrapper (e.g. n8n running a date
// through JSON.stringify twice: `"\"2026-07-16T19:48:11.389Z\""`) before
// parsing — falls back to "now" rather than blocking the whole repair over
// a cosmetic timestamp.
function cleanDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const stripped = value.replace(/^"+|"+$/g, "");
    const parsed = new Date(stripped);
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
    const rawCompanyId = String(row.companyId ?? "");
    const rawJobId = String(row.jobId ?? "");
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

  const rawJobId = String(raw.jobId ?? "");
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
