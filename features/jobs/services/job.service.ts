import { after } from "next/server";
import { connectDB } from "@/server/db/connect";
import { jobRepository, type JobRow, type JobListFilters } from "@/server/repositories/job.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { applicantRepository, type ApplicantListRow } from "@/server/repositories/applicant.repository";
import { userRepository, type UserRow, type TeamMemberRow } from "@/server/repositories/user.repository";
import { autoRepairResolvableOrphanedJobs } from "@/features/settings/services/data-repair.service";
import { listActiveDepartments } from "@/features/settings/services/department.service";
import { listActiveStatuses } from "@/features/settings/services/status-management.service";
import { shouldRunRepairJob } from "@/lib/repair-throttle";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { triggerWebhook } from "@/lib/webhook";
import { computeTrend, getMonthWindows } from "@/lib/trend";
import type { CreateJobInput, UpdateJobInput, UpdateJobTeamInput, LogJobPromotionInput } from "@/validators/job";

const REPAIR_INTERVAL_MS = 5 * 60 * 1000;
// "New" applicants for a job's list-row count — matches the 7-day window
// convention already used elsewhere in this app (e.g. dashboard trends).
const NEW_APPLICANT_WINDOW_DAYS = 7;

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

  const { previousStart, currentStart, now } = getMonthWindows(new Date());

  const [
    list,
    departments,
    totalCount,
    totalThisMonth,
    totalPrevMonth,
    openCount,
    draftCount,
    closedCount,
    openThisMonth,
    openPrevMonth,
    draftThisMonth,
    draftPrevMonth,
    closedThisMonth,
    closedPrevMonth,
  ] = await Promise.all([
    jobRepository.findAllForCompanyPaginated(companyId, filters),
    listActiveDepartments(),
    jobRepository.countTotal(companyId),
    jobRepository.countCreatedBetween(companyId, currentStart, now),
    jobRepository.countCreatedBetween(companyId, previousStart, currentStart),
    jobRepository.countByStatus(companyId, "Open"),
    jobRepository.countByStatus(companyId, "Draft"),
    jobRepository.countByStatus(companyId, "Closed"),
    jobRepository.countByStatusUpdatedBetween(companyId, "Open", currentStart, now),
    jobRepository.countByStatusUpdatedBetween(companyId, "Open", previousStart, currentStart),
    jobRepository.countByStatusUpdatedBetween(companyId, "Draft", currentStart, now),
    jobRepository.countByStatusUpdatedBetween(companyId, "Draft", previousStart, currentStart),
    jobRepository.countByStatusUpdatedBetween(companyId, "Closed", currentStart, now),
    jobRepository.countByStatusUpdatedBetween(companyId, "Closed", previousStart, currentStart),
  ]);

  const newSince = new Date();
  newSince.setDate(newSince.getDate() - NEW_APPLICANT_WINDOW_DAYS);
  const applicantCounts = await jobRepository.countApplicantsByJobIds(
    companyId,
    list.rows.map((row) => row._id),
    newSince,
  );

  return {
    ...list,
    departments,
    applicantCounts,
    stats: {
      total: { value: totalCount, trend: computeTrend(totalThisMonth, totalPrevMonth) },
      open: { value: openCount, trend: computeTrend(openThisMonth, openPrevMonth) },
      draft: { value: draftCount, trend: computeTrend(draftThisMonth, draftPrevMonth) },
      closed: { value: closedCount, trend: computeTrend(closedThisMonth, closedPrevMonth) },
    },
  };
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

  const result = await triggerWebhook("sync-jobs", { companyId: actor.companyId }, actor);

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

  const result = await triggerWebhook("sync-all", { companyId: actor.companyId }, actor);

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
  newApplicantCount: number;
  interviewCount: number;
  recentApplicants: ApplicantListRow[];
  // Hiring Pipeline card/Analytics tab. Stages are the 4 guaranteed pipeline
  // keys every company's Status collection seeds by default (see
  // PIPELINE_STATUSES) that represent forward progress — "rejected" and
  // "incomplete" are excluded since they're exits, not funnel stages.
  // "hired"/"offer" aren't in that guaranteed set (a company may not have
  // configured one), so conversionRate is defined as "reached interview
  // stage" rather than a hire rate that could silently always read 0%.
  pipeline: Array<{ status: string; count: number }>;
  conversionRate: number;
  // Team tab — assigned members (resolved for display) + the full company
  // user list (for the "manage team" picker, same checkbox-list convention
  // as the interview-scheduling form's interviewer picker).
  teamMembers: TeamMemberRow[];
  companyUsers: UserRow[];
  // Promote tab — real source-of-applicant breakdown (Applicant.source,
  // resolved to the company's current Status labels) + the self-reported
  // promotion log already on `job.promotionLog`.
  sourceBreakdown: Array<{ label: string; count: number }>;
};

const PIPELINE_FUNNEL_STAGES = ["new", "screening", "shortlisted", "interview"] as const;

export async function getJobDetail(id: string): Promise<JobDetail | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  const job = await jobRepository.findById(companyId, id);
  if (!job) return null;

  const newSince = new Date();
  newSince.setDate(newSince.getDate() - NEW_APPLICANT_WINDOW_DAYS);

  const [
    applicantCount,
    interviewCount,
    applicantsResult,
    statusCounts,
    applicantCounts,
    teamMembers,
    companyUsers,
    sourceCounts,
    sourceStatuses,
  ] = await Promise.all([
    jobRepository.countApplicants(companyId, id),
    jobRepository.countInterviews(companyId, id),
    applicantRepository.findAllPaginated(companyId, { jobId: id, page: 1, pageSize: 10 }),
    applicantRepository.groupByStatusForJob(companyId, id),
    jobRepository.countApplicantsByJobIds(companyId, [id], newSince),
    userRepository.findTeamMembers(companyId, job.teamMemberIds),
    userRepository.findAll(companyId),
    applicantRepository.groupBySourceForJob(companyId, id),
    listActiveStatuses("applicant_source"),
  ]);

  const countByStatus = new Map(statusCounts.map((row) => [row.status, row.count]));
  const pipeline = PIPELINE_FUNNEL_STAGES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));
  const interviewStageCount = countByStatus.get("interview") ?? 0;
  const conversionRate = applicantCount === 0 ? 0 : Math.round((interviewStageCount / applicantCount) * 1000) / 10;
  const newApplicantCount = applicantCounts.get(id)?.new ?? 0;

  const sourceLabel = new Map(sourceStatuses.map((s) => [s.key, s.name]));
  const sourceBreakdown = sourceCounts.map((row) => ({ label: sourceLabel.get(row.source) ?? row.source, count: row.count }));

  return {
    job,
    applicantCount,
    newApplicantCount,
    interviewCount,
    recentApplicants: applicantsResult.rows,
    pipeline,
    conversionRate,
    teamMembers,
    companyUsers,
    sourceBreakdown,
  };
}

export async function updateJobTeam(input: UpdateJobTeamInput): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const job = await jobRepository.updateTeamMembers(actor.companyId, input.jobId, input.memberIds);
  if (!job) throw new Error("Job not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.team_updated",
    entityType: "job",
    entityId: job._id,
    message: `${actor.name} updated the hiring team for "${job.title}"`,
  });

  return job;
}

export async function logJobPromotion(input: LogJobPromotionInput): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const job = await jobRepository.addPromotionLogEntry(actor.companyId, input.jobId, {
    channel: input.channel,
    customChannel: input.customChannel,
    url: input.url || undefined,
    notes: input.notes,
    loggedBy: actor.id === "system" ? undefined : actor.id,
    loggedByName: actor.name,
  });
  if (!job) throw new Error("Job not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.promotion_logged",
    entityType: "job",
    entityId: job._id,
    message: `${actor.name} logged a promotion of "${job.title}" on ${input.channel === "other" ? input.customChannel : input.channel}`,
  });

  return job;
}

export async function removeJobPromotionLogEntry(jobId: string, entryId: string): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");

  const job = await jobRepository.removePromotionLogEntry(actor.companyId, jobId, entryId);
  if (!job) throw new Error("Job not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.promotion_log_removed",
    entityType: "job",
    entityId: job._id,
    message: `${actor.name} removed a promotion log entry from "${job.title}"`,
  });

  return job;
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
