import { getApplicantDetail } from "@/features/applicants/services/applicant.service";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { emailLogRepository } from "@/server/repositories/email-log.repository";
import { applicantFollowupRepository } from "@/server/repositories/applicant-followup.repository";
import { interviewRepository } from "@/server/repositories/interview.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { triggerWebhook } from "@/lib/webhook";
import { EMAIL_TEMPLATE_LABELS, type EmailTemplate } from "@/constants/email";

export type NotificationResult = { success: true; data: unknown } | { success: false; error: string };

function summarizeResponse(data: unknown): string | undefined {
  if (data === null || data === undefined) return undefined;
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return text.slice(0, 500);
}

export type SendApplicantEmailOptions = {
  template: EmailTemplate;
  interviewId?: string;
};

export async function sendApplicantEmail(
  applicantId: string,
  options: SendApplicantEmailOptions = { template: "general_notification" },
): Promise<NotificationResult> {
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.notify");

  const applicant = await getApplicantDetail(applicantId);
  if (!applicant) return { success: false, error: "Applicant not found" };
  if (!applicant.email) return { success: false, error: "This applicant has no email on file" };

  if (await emailLogRepository.existsRecentSuccess(actor.companyId, applicantId, options.template, options.interviewId)) {
    return { success: false, error: "An email like this was already sent moments ago" };
  }

  let subject = EMAIL_TEMPLATE_LABELS[options.template];
  let payload: Record<string, unknown> = {
    applicantId: applicant._id,
    name: applicant.name,
    email: applicant.email,
    jobTitle: applicant.jobId?.title ?? null,
    template: options.template,
  };

  if (options.template === "interview_invite") {
    if (!options.interviewId) return { success: false, error: "No interview selected" };
    const interview = await interviewRepository.findById(actor.companyId, options.interviewId);
    if (!interview) return { success: false, error: "Interview not found" };

    subject = `Interview scheduled: ${applicant.jobId?.title ?? "your application"}`;
    payload = {
      ...payload,
      subject,
      interview: {
        type: interview.type,
        scheduledAt: interview.scheduledAt,
        durationMinutes: interview.durationMinutes,
        meetingLink: interview.meetingLink,
      },
    };
  } else {
    subject = EMAIL_TEMPLATE_LABELS.general_notification;
    payload = { ...payload, subject, status: applicant.status };
  }

  const result = await triggerWebhook("send-email", payload);

  await emailLogRepository.create({
    companyId: actor.companyId,
    applicantId: applicant._id,
    interviewId: options.interviewId,
    to: applicant.email,
    subject,
    template: options.template,
    status: result.ok ? "sent" : "failed",
    userId: actor.id === "system" ? undefined : actor.id,
    userName: actor.name,
    response: result.ok ? summarizeResponse(result.data) : undefined,
    error: result.ok ? undefined : result.error,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "applicant.email_sent",
    entityType: "applicant",
    entityId: applicant._id,
    message: result.ok
      ? `${subject} email sent to ${applicant.name}`
      : `Failed to send "${subject}" email to ${applicant.name}: ${result.error}`,
  });

  // Every communication channel also writes here (see
  // applicant-followup.service comment on models/ApplicantFollowup.ts) so
  // the dashboard's communication counters have one place to count from.
  // The applicant timeline UI still reads email detail from EmailLog above
  // to avoid showing the same email twice.
  await applicantFollowupRepository.create({
    companyId: actor.companyId,
    applicantId: applicant._id,
    type: "email",
    source: "send-email",
    status: result.ok ? "sent" : "failed",
    response: result.ok ? summarizeResponse(result.data) : undefined,
    error: result.ok ? undefined : result.error,
    createdBy: actor.id === "system" ? undefined : actor.id,
    createdByName: actor.name,
  });

  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function sendApplicantSms(applicantId: string): Promise<NotificationResult> {
  const actor = await getCurrentUser();
  requireRole(actor, "applicant.notify");
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

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "applicant.sms_sent",
    entityType: "applicant",
    entityId: applicant._id,
    message: result.ok
      ? `SMS sent to ${applicant.name}`
      : `Failed to send SMS to ${applicant.name}: ${result.error}`,
  });

  await applicantFollowupRepository.create({
    companyId: actor.companyId,
    applicantId: applicant._id,
    type: "sms",
    source: "send-sms",
    status: result.ok ? "sent" : "failed",
    response: result.ok ? summarizeResponse(result.data) : undefined,
    error: result.ok ? undefined : result.error,
    createdBy: actor.id === "system" ? undefined : actor.id,
    createdByName: actor.name,
  });

  if (!result.ok) return { success: false, error: result.error };
  return { success: true, data: result.data };
}
