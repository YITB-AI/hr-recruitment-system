// Client-safe: no Mongoose/model imports here. Job.status/type are free-text
// strings in the schema (not enums — n8n writes whatever it writes), these
// are just the options offered when creating a job from the app itself.
export const JOB_STATUSES = ["Open", "On Hold", "Closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;
export type JobType = (typeof JOB_TYPES)[number];
