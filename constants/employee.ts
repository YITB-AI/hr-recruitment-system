// Client-safe: no Mongoose/model imports here, so client components can use
// these without pulling the MongoDB driver into the browser bundle.

// Employee statuses are no longer a fixed compile-time list — every company
// manages its own set via Settings > Statuses (see models/Status.ts,
// server/repositories/status.repository.ts). This alias keeps every
// existing `EmploymentStatus`-typed signature valid without an unrelated
// mechanical rewrite; real validation now happens against the Status
// collection at the service layer (see employee.service.ts).
export type EmploymentStatus = string;

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
};
