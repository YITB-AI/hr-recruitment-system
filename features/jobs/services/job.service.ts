import { connectDB } from "@/server/db/connect";
import { jobRepository, type JobRow } from "@/server/repositories/job.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { CreateJobInput } from "@/validators/job";

export async function getJobsPageData(): Promise<JobRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return jobRepository.findAllForCompany(companyId);
}

export async function getJob(id: string): Promise<JobRow | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return jobRepository.findById(companyId, id);
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
