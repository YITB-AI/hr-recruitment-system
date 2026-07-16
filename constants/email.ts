export const EMAIL_TEMPLATES = ["general_notification", "interview_invite", "interview_reminder"] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplate, string> = {
  general_notification: "Application Status Update",
  interview_invite: "Interview Invitation",
  interview_reminder: "Interview Reminder",
};

export const EMAIL_LOG_STATUSES = ["sent", "failed"] as const;
export type EmailLogStatus = (typeof EMAIL_LOG_STATUSES)[number];
