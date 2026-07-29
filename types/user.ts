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
  avatarUrl: string | null;
  // Cross-company platform operator flag — see the comment on
  // models/User.ts's isPlatformAdmin. Distinct from role "admin".
  isPlatformAdmin: boolean;
  // Set only while an admin is impersonating this user (see
  // lib/auth/impersonation.ts) — null on every normal session.
  impersonatedBy: { id: string; name: string } | null;
};
