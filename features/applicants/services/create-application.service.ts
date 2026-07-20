import crypto from "node:crypto";
import { connectDB } from "@/server/db/connect";
import { jobRepository } from "@/server/repositories/job.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { triggerWebhook } from "@/lib/webhook";

export type CreateApplicationResult = { success: true } | { success: false; error: string };

export const MAX_CV_BYTES = 10 * 1024 * 1024;
export const ALLOWED_CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const DUPLICATE_SUBMIT_WINDOW_MS = 60 * 1000;
const SUBMISSION_ACTION = "job.application_submitted";

// The app never creates the Applicant record for this flow — n8n does,
// directly in MongoDB, after parsing the CV. We only trigger the workflow
// and log that a submission was initiated (not that a candidate record
// actually exists, since we have no way to confirm that here).
export async function requestApplicationCreate(jobId: string, file: File): Promise<CreateApplicationResult> {
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.create");
  await connectDB();

  // jobTitle/jobDescription always come from this tenant-scoped lookup,
  // never from client input — findById filters {_id, companyId}, so a job
  // belonging to a different company simply resolves to null here.
  const job = await jobRepository.findById(actor.companyId, jobId);
  if (!job) return { success: false, error: "Job not found" };

  if (
    await activityLogRepository.existsRecentByActorAndEntity(
      actor.companyId,
      actor.id,
      SUBMISSION_ACTION,
      jobId,
      DUPLICATE_SUBMIT_WINDOW_MS,
    )
  ) {
    return { success: false, error: "An application for this job was already submitted moments ago" };
  }

  if (!ALLOWED_CV_TYPES.has(file.type)) {
    return { success: false, error: "Only PDF, DOC, or DOCX files are supported" };
  }
  if (file.size > MAX_CV_BYTES) {
    return { success: false, error: "CV must be smaller than 10MB" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileBase64 = buffer.toString("base64");

  const result = await triggerWebhook(
    "create-application",
    {
      idempotencyKey: crypto.randomUUID(),
      // Always the session-derived company, never anything from the client —
      // n8n uses this to set the new Applicant's companyId directly.
      companyId: actor.companyId,
      jobId: job._id,
      jobTitle: job.title,
      jobDescription: job.description,
      submittedByName: actor.name,
      fileName: file.name,
      mimeType: file.type,
      fileBase64,
    },
    actor,
  );

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: SUBMISSION_ACTION,
    entityType: "job",
    entityId: jobId,
    message: result.ok
      ? `${actor.name} submitted a new application (CV) for ${job.title} — awaiting processing`
      : `Failed to submit a new application for ${job.title}: ${result.error}`,
  });

  if (!result.ok) return { success: false, error: result.error };
  return { success: true };
}
