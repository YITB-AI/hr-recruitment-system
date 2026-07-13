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
