import { connectDB } from "@/server/db/connect";
import { jobRepository, type JobRow, type JobListFilters } from "@/server/repositories/job.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { applicantRepository, type ApplicantListRow } from "@/server/repositories/applicant.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { CreateJobInput, UpdateJobInput } from "@/validators/job";

export async function getJobsPageData(filters: JobListFilters) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return jobRepository.findAllForCompanyPaginated(companyId, filters);
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
