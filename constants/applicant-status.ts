export const APPLICANT_STATUSES = [
  "new",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "incomplete",
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

export const PIPELINE_STATUSES: ApplicantStatus[] = [
  "new",
  "screening",
  "shortlisted",
  "interview",
  "rejected",
  "incomplete",
];

export const APPLICANT_STATUS_CONFIG: Record<
  ApplicantStatus,
  { label: string; colorVar: string; badgeClassName: string }
> = {
  new: {
    label: "New",
    colorVar: "var(--status-new)",
    badgeClassName: "bg-[var(--status-new)]/10 text-[var(--status-new)]",
  },
  screening: {
    label: "Screening",
    colorVar: "var(--status-screening)",
    badgeClassName: "bg-[var(--status-screening)]/10 text-[var(--status-screening)]",
  },
  shortlisted: {
    label: "Shortlisted",
    colorVar: "var(--status-shortlisted)",
    badgeClassName: "bg-[var(--status-shortlisted)]/10 text-[var(--status-shortlisted)]",
  },
  interview: {
    label: "Interview Scheduled",
    colorVar: "var(--status-interview)",
    badgeClassName: "bg-[var(--status-interview)]/10 text-[var(--status-interview)]",
  },
  offer: {
    label: "Offer Sent",
    colorVar: "var(--status-offer)",
    badgeClassName: "bg-[var(--status-offer)]/10 text-[var(--status-offer)]",
  },
  hired: {
    label: "Hired",
    colorVar: "var(--status-hired)",
    badgeClassName: "bg-[var(--status-hired)]/10 text-[var(--status-hired)]",
  },
  rejected: {
    label: "Rejected",
    colorVar: "var(--status-rejected)",
    badgeClassName: "bg-[var(--status-rejected)]/10 text-[var(--status-rejected)]",
  },
  incomplete: {
    label: "Incomplete",
    colorVar: "var(--status-incomplete)",
    badgeClassName: "bg-[var(--status-incomplete)]/10 text-[var(--status-incomplete)]",
  },
};
