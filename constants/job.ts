// Client-safe: no Mongoose/model imports here. Job.status/type are free-text
// strings in the schema (not enums — n8n writes whatever it writes), these
// are just the options offered when creating a job from the app itself.
export const JOB_STATUSES = ["Draft", "Open", "On Hold", "Closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;
export type JobType = (typeof JOB_TYPES)[number];

// Unlike status/type above, the fields below are 100%-app-authored (n8n
// never sets them), so a real, enforced enum is safe here.
export const EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Lead", "Executive"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const WORK_MODES = ["Remote", "Hybrid", "Onsite"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const JOB_SALARY_CURRENCIES = ["USD", "EUR", "GBP", "PKR", "INR"] as const;
export type JobSalaryCurrency = (typeof JOB_SALARY_CURRENCIES)[number];

export const JOB_STATUS_COLORS: Record<string, string> = {
  Draft: "#71717a",
  Open: "#22c55e",
  "On Hold": "#f59e0b",
  Closed: "#ef4444",
};
