// Client-safe: no Mongoose/model imports here, so client components (forms
// using these for validation/dropdowns) never pull mongoose into the bundle.
export const USER_ROLES = ["admin", "recruiter", "hr", "interviewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  hr: "HR",
  recruiter: "Recruiter",
  interviewer: "Interviewer",
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full access to every module, including company settings, users, and roles.",
  hr: "Manages employees, documents, applicants, and interviews. No company settings.",
  recruiter: "Manages applicants, interviews, and documents for candidates. No employee records.",
  interviewer: "Read-only access to assigned applicants and interviews.",
};
