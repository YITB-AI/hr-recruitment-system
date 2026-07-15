export const FOLLOWUP_TYPES = ["call", "email", "sms", "whatsapp"] as const;
export type FollowupType = (typeof FOLLOWUP_TYPES)[number];

export const FOLLOWUP_TYPE_LABELS: Record<FollowupType, string> = {
  call: "AI Call",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

// "in_progress"/"completed" are call-specific (set by the n8n callback,
// app/api/webhooks/ai-call) — email/sms rows never pass through them, they
// go straight from pending to sent/failed since their outcome is known
// synchronously.
export const FOLLOWUP_STATUSES = ["pending", "sent", "delivered", "read", "in_progress", "completed", "failed"] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

// How an AI call concluded, reported by n8n once it knows. Only meaningful
// when type === "call" and status === "completed".
export const FOLLOWUP_OUTCOMES = [
  "interview_scheduled",
  "reschedule_requested",
  "callback_requested",
  "not_interested",
  "withdrawn",
  "rejected",
  "accepted",
  "no_answer",
  "voicemail",
  "other",
] as const;
export type FollowupOutcome = (typeof FOLLOWUP_OUTCOMES)[number];

export const FOLLOWUP_OUTCOME_LABELS: Record<FollowupOutcome, string> = {
  interview_scheduled: "Interview proposed",
  reschedule_requested: "Reschedule requested",
  callback_requested: "Callback requested",
  not_interested: "Not interested",
  withdrawn: "Withdrawn",
  rejected: "Rejected",
  accepted: "Accepted",
  no_answer: "No answer",
  voicemail: "Voicemail",
  other: "Other",
};
