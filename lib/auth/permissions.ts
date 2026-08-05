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
  "applicant.note.manage",
  "applicant.create",
  "saved_view.manage",
  "interview.schedule",
  "interview.delete",
  "settings.manage",
  "user.manage",
  "job.create",
  "job.manage",
  "job.hr_requirements.manage",
  "status.manage",
  "department.manage",
  "employee_type.manage",
  "employee_lookup.manage",
  "ai_call_question.manage",
  "user.impersonate",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// admin: everything. hr: employee/document/applicant/interview management,
// no company-level settings. recruiter: applicant-facing work (documents,
// notifications, status changes, interviews, saved views), no employee
// records, no settings. interviewer: read-only in this phase — no mutation
// actions granted (feedback submission isn't built yet).
//
// This is no longer the live source of truth for authorization -- see the
// comment on requireRole below. It's the one-time seed data for the 4
// built-in system Roles (server/repositories/role.repository.ts), used the
// first time the Role collection is ever read, and the fallback matrix for
// any actor that never went through session resolution (scripts). Once
// seeded, the Global Super Admin can edit any of these roles' actual
// permissions from the Platform workspace with no code deployment -- this
// object only ever reflects what shipped on day one.
export const SYSTEM_ROLE_DEFAULTS: Record<UserRole, "*" | Set<PermissionAction>> = {
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
    "applicant.note.manage",
    "applicant.create",
    "saved_view.manage",
    "interview.schedule",
    "interview.delete",
    "job.create",
    "job.manage",
    "job.hr_requirements.manage",
  ]),
  recruiter: new Set([
    "document.generate",
    "document.status.transition",
    "document.delete",
    "applicant.status.change",
    "applicant.notify",
    "applicant.note.manage",
    "applicant.create",
    "saved_view.manage",
    "interview.schedule",
    "interview.delete",
    "job.create",
    "job.manage",
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
//
// Dynamic RBAC: `user.permissions` is resolved ONCE per request, at session
// verification time (lib/auth/session.ts's verifySessionToken looks up the
// caller's Role document and attaches the result to SessionUser) -- not
// looked up again on every requireRole call. This keeps requireRole itself
// synchronous, so none of its ~90 existing call sites needed to become
// `await requireRole(...)`; the DB-backed part happens exactly once, up
// front, where a missed `await` would be an immediate, obvious type error
// (verifySessionToken already returns a Promise its caller must await)
// rather than a silently-ignored one buried in a service function.
//
// Any actor that never went through session resolution (SYSTEM_USER in
// scripts, or a test-constructed actor with no `permissions` field) falls
// back to the hardcoded SYSTEM_ROLE_DEFAULTS matrix above -- the exact
// behavior this function had before Dynamic RBAC shipped, so nothing
// outside a real request is affected by this change.
export function requireRole(user: { role: string; permissions?: "*" | PermissionAction[] }, action: PermissionAction): void {
  if (user.permissions !== undefined) {
    if (user.permissions === "*" || user.permissions.includes(action)) return;
    throw new ForbiddenError(action);
  }
  const allowed = SYSTEM_ROLE_DEFAULTS[user.role as UserRole];
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
