import { connectDB } from "@/server/db/connect";
import { jobRepository } from "@/server/repositories/job.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";

export async function listUnmappedJobs() {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);
  return jobRepository.findUnmapped();
}

export async function listCompaniesForMapping() {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);
  return companyRepository.findAll();
}

export async function assignJobToCompany(jobId: string, companyId: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const company = await companyRepository.findById(companyId);
  if (!company) throw new Error("Company not found");

  await jobRepository.assignCompany(jobId, companyId);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "job.mapped",
    entityType: "job",
    entityId: jobId,
    message: `${actor.name} assigned an unmapped job to ${company.name}`,
  });
}
