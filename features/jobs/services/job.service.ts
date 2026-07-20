import { after } from "next/server";
import { connectDB } from "@/server/db/connect";
import { jobRepository, type JobRow, type JobListFilters } from "@/server/repositories/job.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { applicantRepository, type ApplicantListRow } from "@/server/repositories/applicant.repository";
import { autoRepairResolvableOrphanedJobs } from "@/features/settings/services/data-repair.service";
import { shouldRunRepairJob } from "@/lib/repair-throttle";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { triggerWebhook } from "@/lib/webhook";
import type { CreateJobInput, UpdateJobInput } from "@/validators/job";

const REPAIR_INTERVAL_MS = 5 * 60 * 1000;

// Fire-and-forget, after the response has gone out — same pattern as
// applicant.service.ts's triggerAutoRepairInBackground, throttled the same
// way (see lib/repair-throttle.ts).
function triggerAutoRepairInBackground(): void {
  after(async () => {
    try {
      if (!(await shouldRunRepairJob("jobs", REPAIR_INTERVAL_MS))) return;
      await autoRepairResolvableOrphanedJobs();
    } catch (error) {
      console.error("Auto-repair of orphaned job records failed:", error);
    }
  });
}

export async function getJobsPageData(filters: JobListFilters) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  triggerAutoRepairInBackground();
  return jobRepository.findAllForCompanyPaginated(companyId, filters);
}

// "Sync Jobs"/"Sync All" buttons on the Jobs page — POST companyId to n8n,
// which pulls fresh data from the external source and writes it directly
// into MongoDB (same as the existing n8n-authored Job pipeline). Tenant
// isolation: companyId is always the session-derived one, never client
// input.
export async function syncJobs(): Promise<{ success: true } | { success: false; error: string }> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const result = await triggerWebhook("sync-jobs", { companyId: actor.companyId });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.sync_requested",
    entityType: "job",
    entityId: actor.companyId,
    message: result.ok
      ? `${actor.name} triggered a job sync`
      : `${actor.name}'s job sync request failed: ${result.error}`,
  });

  return result.ok ? { success: true } : { success: false, error: result.error };
}

export async function syncAll(): Promise<{ success: true } | { success: false; error: string }> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const result = await triggerWebhook("sync-all", { companyId: actor.companyId });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.sync_all_requested",
    entityType: "job",
    entityId: actor.companyId,
    message: result.ok
      ? `${actor.name} triggered a full sync`
      : `${actor.name}'s full sync request failed: ${result.error}`,
  });

  return result.ok ? { success: true } : { success: false, error: result.error };
}

export async function getJob(id: string): Promise<JobRow | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return jobRepository.findById(companyId, id);
}

export type JobDetail = {
  job: JobRow;
  applicantCount: number;
  interviewCount: number;
  recentApplicants: ApplicantListRow[];
};

export async function getJobDetail(id: string): Promise<JobDetail | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  const job = await jobRepository.findById(companyId, id);
  if (!job) return null;

  const [applicantCount, interviewCount, applicantsResult] = await Promise.all([
    jobRepository.countApplicants(companyId, id),
    jobRepository.countInterviews(companyId, id),
    applicantRepository.findAllPaginated(companyId, { jobId: id, page: 1, pageSize: 10 }),
  ]);

  return { job, applicantCount, interviewCount, recentApplicants: applicantsResult.rows };
}

export async function createJob(input: CreateJobInput): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.create");

  const job = await jobRepository.create(actor.companyId, input);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.created",
    entityType: "job",
    entityId: job._id,
    message: `${actor.name} created job posting "${job.title}"`,
  });

  return job;
}

export async function updateJob(input: UpdateJobInput): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const { jobId, ...fields } = input;
  const job = await jobRepository.update(actor.companyId, jobId, fields);
  if (!job) throw new Error("Job not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.updated",
    entityType: "job",
    entityId: job._id,
    message: `${actor.name} updated job posting "${job.title}"`,
  });

  return job;
}

export async function archiveJob(id: string): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const job = await jobRepository.archive(actor.companyId, id);
  if (!job) throw new Error("Job not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.archived",
    entityType: "job",
    entityId: job._id,
    message: `${actor.name} archived job posting "${job.title}"`,
  });

  return job;
}

export async function restoreJob(id: string): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const job = await jobRepository.restore(actor.companyId, id);
  if (!job) throw new Error("Job not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.restored",
    entityType: "job",
    entityId: job._id,
    message: `${actor.name} restored job posting "${job.title}"`,
  });

  return job;
}

export async function deleteJob(id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const job = await jobRepository.findById(actor.companyId, id);
  if (!job) throw new Error("Job not found");

  const applicantCount = await jobRepository.countApplicants(actor.companyId, id);
  if (applicantCount > 0) {
    throw new Error(
      `This job has ${applicantCount} applicant${applicantCount === 1 ? "" : "s"} attached — archive it instead of deleting, so their records aren't orphaned.`,
    );
  }

  await jobRepository.delete(actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.deleted",
    entityType: "job",
    entityId: id,
    message: `${actor.name} deleted job posting "${job.title}"`,
  });
}
