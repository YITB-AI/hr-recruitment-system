// Client-safe: no Mongoose/model imports here, so client components can use
// these enums without pulling the MongoDB driver into the browser bundle.
export const INTERVIEW_TYPES = ["technical", "hr", "managerial", "final"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
