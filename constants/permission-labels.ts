// Client-safe display labels for lib/auth/permissions.ts's PERMISSION_ACTIONS
// — used only by the Settings > Permissions screen. Never a second source
// of truth for WHO can do WHAT (that's ROLE_PERMISSIONS in permissions.ts);
// this purely maps each real action string to a module + human label.
export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  employee: "Employees",
  document: "Documents",
  applicant: "Applicants",
  saved_view: "Saved Views",
  interview: "Interviews",
  settings: "Company Settings",
  user: "Users & Roles",
  job: "Jobs",
  status: "Statuses",
};

export const PERMISSION_ACTION_LABELS: Record<string, string> = {
  "employee.create": "Create employees",
  "employee.update": "Update employees",
  "employee.delete": "Delete employees",
  "document.template.manage": "Manage document templates",
  "document.generate": "Generate documents",
  "document.status.transition": "Change document status",
  "document.delete": "Delete documents",
  "applicant.status.change": "Change applicant status",
  "applicant.notify": "Email/SMS/call applicants",
  "saved_view.manage": "Create/delete saved views",
  "interview.schedule": "Schedule interviews",
  "settings.manage": "Manage company settings",
  "user.manage": "Manage users & reset passwords",
  "job.create": "Create jobs",
  "job.manage": "Update/archive/delete jobs",
  "status.manage": "Manage applicant/employee statuses",
};

export function permissionModule(action: string): string {
  return action.split(".")[0];
}
