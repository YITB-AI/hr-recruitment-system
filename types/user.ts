import type { PermissionAction } from "@/lib/auth/permissions";

export type SessionUser = {
  id: string;
  // The current Session row's own _id (distinct from the user's id above)
  // — lets the UI badge "this device" among a list of the user's active
  // sessions (see features/profile/components/active-sessions-card.tsx).
  // Absent when there's no real session (the script-context SYSTEM_USER
  // fallback in lib/current-user.ts).
  sessionId: string | null;
  // Added for Phase 1 (multi-tenancy) — a forward-compatible widening, not a
  // breaking change: existing call sites that only read id/name/email/role/
  // avatarUrl are unaffected. Needed so service functions can thread the
  // caller's companyId into every tenant-scoped repository call (Phase 1c).
  companyId: string;
  name: string;
  email: string;
  role: string;
  // Dynamic RBAC: this user's role's ACTUAL permission set, resolved once
  // at session-verification time from the live Role document (see
  // lib/auth/session.ts's verifySessionToken) — not derived from `role`
  // again by every requireRole call. "*" mirrors admin's historical
  // wildcard (every action, including ones added later); an array is an
  // explicit, exact list. See lib/auth/permissions.ts's requireRole for
  // how this is consumed.
  permissions: "*" | PermissionAction[];
  avatarUrl: string | null;
  // Cross-company platform operator flag — see the comment on
  // models/User.ts's isPlatformAdmin. Distinct from role "admin".
  isPlatformAdmin: boolean;
  // Set only while an admin is impersonating this user (see
  // lib/auth/impersonation.ts) — null on every normal session.
  impersonatedBy: { id: string; name: string } | null;
  // The two "must complete this before using the app" onboarding flags,
  // checked both at login (actions/auth.ts) and on every subsequent request
  // to an (app)-group page (app/(app)/layout.tsx) — a session alone must
  // never grant access to /dashboard etc. while either is still pending.
  mustChangePassword: boolean;
  // Computed from mfaSetupCompletedAt (a field that survives a later MFA
  // disable), NOT from the toggleable mfaEnabled — so this only asks "has
  // this admin EVER finished setup," never re-becoming true just because
  // MFA was turned off again. Always false for non-admins.
  mfaSetupRequired: boolean;
};
