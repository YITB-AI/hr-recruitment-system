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

// Promote tab — self-reported promotion channels, not real job-board/social
// API integrations (none exist). "other" pairs with a free-text
// customChannel field on the log entry itself.
export const PROMOTION_CHANNELS = ["linkedin", "indeed", "company_website", "social_media", "other"] as const;
export type PromotionChannel = (typeof PROMOTION_CHANNELS)[number];

export const PROMOTION_CHANNEL_LABELS: Record<PromotionChannel, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  company_website: "Company Website",
  social_media: "Social Media",
  other: "Other",
};
