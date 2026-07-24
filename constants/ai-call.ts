// The purpose of an AI call, distinct from FOLLOWUP_TYPES (which is the
// channel — call/email/sms/whatsapp). HR picks one before triggering a
// call; it's carried through to n8n so its own workflow/prompt-selection
// logic can adapt the conversation flow — that adaptation itself is n8n's
// responsibility, not this app's.
export const AI_CALL_TYPES = [
  "initial_screening",
  "hr_interview",
  "technical_interview",
  "site_visit",
  "follow_up_call",
  "final_interview",
] as const;
export type AiCallType = (typeof AI_CALL_TYPES)[number];

export const AI_CALL_TYPE_LABELS: Record<AiCallType, string> = {
  initial_screening: "Initial Screening",
  hr_interview: "HR Interview",
  technical_interview: "Technical Interview",
  site_visit: "Site Visit",
  follow_up_call: "Follow-up Call",
  final_interview: "Final Interview",
};
