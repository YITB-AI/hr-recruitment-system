// Client-safe: no Mongoose/model imports here.
export const STATUS_MODULES = ["applicant", "employee", "applicant_source"] as const;
export type StatusModule = (typeof STATUS_MODULES)[number];

export const STATUS_MODULE_LABELS: Record<StatusModule, string> = {
  applicant: "Applicant Status",
  employee: "Employee Status",
  applicant_source: "Applicant Source",
};
