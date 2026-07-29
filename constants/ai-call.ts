// The purpose of an AI call, distinct from FOLLOWUP_TYPES (which is the
// channel — call/email/sms/whatsapp). HR picks one before triggering a
// call; it's carried through to n8n so its own workflow/prompt-selection
// logic can adapt the conversation flow — that adaptation itself is n8n's
// responsibility, not this app's.
export const AI_CALL_TYPES = [
  "initial_screening",
  "hr_interview",
  "technical_interview",
  "follow_up_call",
  "final_interview",
] as const;
export type AiCallType = (typeof AI_CALL_TYPES)[number];

export const AI_CALL_TYPE_LABELS: Record<AiCallType, string> = {
  initial_screening: "Initial Screening",
  hr_interview: "HR Interview",
  technical_interview: "Technical Interview",
  follow_up_call: "Follow-up Call",
  final_interview: "Final Interview",
};

// Interview modality — distinct from AI_CALL_TYPES (the call's purpose) and
// from Interview.type (screening/technical/etc. category on the Interview
// model). "onsite" triggers company location/contact auto-fill from Company
// Profile settings (features/applicants/services/ai-call.service.ts) —
// never entered by hand in the Request AI Call form.
export const AI_CALL_INTERVIEW_MODES = ["online", "onsite"] as const;
export type AiCallInterviewMode = (typeof AI_CALL_INTERVIEW_MODES)[number];

export const AI_CALL_INTERVIEW_MODE_LABELS: Record<AiCallInterviewMode, string> = {
  online: "Online",
  onsite: "Onsite",
};
