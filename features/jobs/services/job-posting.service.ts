import { connectDB } from "@/server/db/connect";
import { jobRepository, type JobRow } from "@/server/repositories/job.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { requireCompanyFeature } from "@/lib/auth/feature-access";
import { getJobPostingProvider } from "@/lib/job-posting/providers";
import type { JobPostingPlatform } from "@/constants/job";
import type { PublishResult } from "@/lib/job-posting/types";

// Distribution action, same gate as the rest of the Promote tab (job.manage
// is already shared by hr+recruiter) — not an HR-requirements-style
// restricted action.
export async function publishJobToPlatform(jobId: string, platform: JobPostingPlatform): Promise<PublishResult> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");
  const company = await companyRepository.findById(actor.companyId);
  if (!company) throw new Error("Company not found");
  requireCompanyFeature(company, "socialJobPosting");

  const job = await jobRepository.findById(actor.companyId, jobId);
  if (!job) throw new Error("Job not found");

  await jobRepository.upsertPlatformPosting(actor.companyId, jobId, {
    platform,
    status: "publishing",
    requestedBy: resolveActorId(actor),
    requestedByName: actor.name,
  });

  const provider = getJobPostingProvider(platform);
  const result = await provider.publishJob(job, actor.companyId);

  await jobRepository.upsertPlatformPosting(actor.companyId, jobId, {
    platform,
    status: result.ok ? "published" : "failed",
    externalPostId: result.ok ? result.externalPostId : undefined,
    externalPostUrl: result.ok ? result.externalPostUrl : undefined,
    error: result.ok ? undefined : result.error,
    requestedBy: resolveActorId(actor),
    requestedByName: actor.name,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "job.platform_posting_attempted",
    entityType: "job",
    entityId: jobId,
    message: result.ok
      ? `${actor.name} published "${job.title}" to ${platform}`
      : `${actor.name}'s attempt to publish "${job.title}" to ${platform} failed: ${result.error}`,
  });

  return result;
}

export async function setPostToIndeed(jobId: string, postToIndeed: boolean): Promise<JobRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "job.manage");
  const company = await companyRepository.findById(actor.companyId);
  if (!company) throw new Error("Company not found");
  requireCompanyFeature(company, "indeedJobFeed");

  const job = await jobRepository.setPostToIndeed(actor.companyId, jobId, postToIndeed);
  if (!job) throw new Error("Job not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: postToIndeed ? "job.indeed_feed_enabled" : "job.indeed_feed_disabled",
    entityType: "job",
    entityId: jobId,
    message: `${actor.name} ${postToIndeed ? "added" : "removed"} "${job.title}" ${postToIndeed ? "to" : "from"} the Indeed feed`,
  });

  return job;
}
