import type { UserRole } from "@/models/User";

// Function-level checks only — no per-field/per-record permissions in this
// phase (e.g. "recruiter can generate documents" is checked here, but
// "recruiter can't target an employee recipient specifically" is not; see
// the plan's Phase 1 "cuts for this phase" section). Applied at the top of
// each mutation, immediately after resolving the caller via getCurrentUser().
export const PERMISSION_ACTIONS = [
  "employee.create",
  "employee.update",
  "employee.delete",
  "document.template.manage",
  "document.generate",
  "document.status.transition",
  "document.delete",
  "applicant.status.change",
  "applicant.notify",
  "saved_view.manage",
  "interview.schedule",
  "settings.manage",
  "user.manage",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// admin: everything. hr: employee/document/applicant/interview management,
// no company-level settings. recruiter: applicant-facing work (documents,
// notifications, status changes, interviews, saved views), no employee
// records, no settings. interviewer: read-only in this phase — no mutation
// actions granted (feedback submission isn't built yet).
const ROLE_PERMISSIONS: Record<UserRole, "*" | Set<PermissionAction>> = {
  admin: "*",
  hr: new Set([
    "employee.create",
    "employee.update",
    "employee.delete",
    "document.template.manage",
    "document.generate",
    "document.status.transition",
    "document.delete",
    "applicant.status.change",
    "applicant.notify",
    "saved_view.manage",
    "interview.schedule",
  ]),
  recruiter: new Set([
    "document.generate",
    "document.status.transition",
    "document.delete",
    "applicant.status.change",
    "applicant.notify",
    "saved_view.manage",
    "interview.schedule",
  ]),
  interviewer: new Set([]),
};

export class ForbiddenError extends Error {
  constructor(action: PermissionAction) {
    super(`Your role doesn't have permission to perform this action (${action}).`);
    this.name = "ForbiddenError";
  }
}

// Throws ForbiddenError on denial — every caller already sits inside a
// try/catch that turns a thrown Error into `{success:false, error: message}`
// (the existing ActionResult pattern in actions/*.ts), so no new
// error-handling shape is introduced.
export function requireRole(user: { role: string }, action: PermissionAction): void {
  const allowed = ROLE_PERMISSIONS[user.role as UserRole];
  if (allowed === "*") return;
  if (allowed?.has(action)) return;
  throw new ForbiddenError(action);
}

export class PlatformForbiddenError extends Error {
  constructor() {
    super("This action is restricted to platform administrators.");
    this.name = "PlatformForbiddenError";
  }
}

// Cross-company actions (creating a new company, assigning an unmapped job
// to a company) are NOT part of the per-company role matrix above — role
// "admin" only ever governs a user's own company. isPlatformAdmin is a
// separate, narrower flag (see models/User.ts) for Digital Auxilius's own
// operators only.
export function requirePlatformAdmin(user: { isPlatformAdmin: boolean }): void {
  if (!user.isPlatformAdmin) throw new PlatformForbiddenError();
}
