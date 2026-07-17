// Client-safe: no Mongoose/model imports here, so client components can use
// these enums without pulling the MongoDB driver into the browser bundle.
// "ai_screening" is auto-created/reused by requestAiCall
// (features/applicants/services/ai-call.service.ts) to back an AI phone
// screening call with a real Interview record — it has no human
// interviewerIds and its scheduledAt starts as "now" (the moment the call
// is placed), later updated to the AI-proposed time if the call outcome
// reports one (see call-outcome.service.ts).
export const INTERVIEW_TYPES = ["technical", "hr", "managerial", "final", "ai_screening"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
