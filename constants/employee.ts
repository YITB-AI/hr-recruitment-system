// Client-safe: no Mongoose/model imports here, so client components can use
// these without pulling the MongoDB driver into the browser bundle.
export const EMPLOYMENT_STATUSES = ["active", "on_leave", "terminated"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

// The reference design calls the "terminated" status "Inactive" — the label
// differs from the stored value so existing data/queries don't need to change.
export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  on_leave: "On Leave",
  terminated: "Inactive",
};

export const EMPLOYMENT_STATUS_BADGE_CLASSNAME: Record<EmploymentStatus, string> = {
  active: "bg-[var(--success)]/10 text-[var(--success)]",
  on_leave: "bg-[var(--status-screening)]/10 text-[var(--status-screening)]",
  terminated: "bg-destructive/10 text-destructive",
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
};
