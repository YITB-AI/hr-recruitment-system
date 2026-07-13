export type SessionUser = {
  id: string;
  // Added for Phase 1 (multi-tenancy) — a forward-compatible widening, not a
  // breaking change: existing call sites that only read id/name/email/role/
  // avatarUrl are unaffected. Needed so service functions can thread the
  // caller's companyId into every tenant-scoped repository call (Phase 1c).
  companyId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
};
