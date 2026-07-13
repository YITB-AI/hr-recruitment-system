import { getApplicantDetail } from "@/features/applicants/services/applicant.service";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { triggerWebhook } from "@/lib/webhook";

export type NotificationResult = { success: true; data: unknown } | { success: false; error: string };

export async function sendApplicantEmail(applicantId: string): Promise<NotificationResult> {
  const applicant = await getApplicantDetail(applicantId);
  if (!applicant) return { success: false, error: "Applicant not found" };

  const result = await triggerWebhook("send-email", {
    applicantId: applicant._id,
    name: applicant.name,
    email: applicant.email,
    jobTitle: applicant.jobId?.title ?? null,
    status: applicant.status,
  });
  if (!result.ok) return { success: false, error: result.error };

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "applicant.email_sent",
    entityType: "applicant",
    entityId: applicant._id,
    message: `Email sent to ${applicant.name}`,
  });

  return { success: true, data: result.data };
}

export async function sendApplicantSms(applicantId: string): Promise<NotificationResult> {
  const applicant = await getApplicantDetail(applicantId);
  if (!applicant) return { success: false, error: "Applicant not found" };
  if (!applicant.phone) return { success: false, error: "Applicant has no phone number on file" };

  const result = await triggerWebhook("send-sms", {
    applicantId: applicant._id,
    name: applicant.name,
    phone: applicant.phone,
    jobTitle: applicant.jobId?.title ?? null,
    status: applicant.status,
  });
  if (!result.ok) return { success: false, error: result.error };

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "applicant.sms_sent",
    entityType: "applicant",
    entityId: applicant._id,
    message: `SMS sent to ${applicant.name}`,
  });

  return { success: true, data: result.data };
}
