// Client-safe mirror of models/Applicant.ts's APPLICANT_SOURCES (that file
// isn't client-safe — it imports mongoose).
export const APPLICANT_SOURCES = ["website", "linkedin", "referral", "job_board", "other"] as const;
export type ApplicantSource = (typeof APPLICANT_SOURCES)[number];

export const APPLICANT_SOURCE_LABELS: Record<ApplicantSource, string> = {
  website: "Website",
  linkedin: "LinkedIn",
  referral: "Referral",
  job_board: "Job Board",
  other: "Other",
};
