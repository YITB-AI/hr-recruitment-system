// Applicant statuses are no longer a fixed compile-time list — every
// company manages its own set via Settings > Statuses (see
// models/Status.ts, server/repositories/status.repository.ts). This alias
// keeps every existing `ApplicantStatus`-typed signature across the
// repository/service layer valid without an unrelated mechanical rewrite;
// the real validation now happens against the Status collection at the
// service layer (see changeApplicantStatus in applicant.service.ts).
export type ApplicantStatus = string;

// The Kanban board's columns — a curated, fixed subset of keys (not all of
// a company's custom statuses get a column; a 20+ column board would be
// unusable). These 6 keys are guaranteed to exist because they're part of
// every company's seeded defaults (see DEFAULT_SEEDS in
// status.repository.ts) and are never renamed. Each column's display
// name/color still comes from the Status collection via
// StatusConfigProvider/useStatusLookup, not from a label hardcoded here.
export const PIPELINE_STATUSES: ApplicantStatus[] = [
  "new",
  "screening",
  "shortlisted",
  "interview",
  "rejected",
  "incomplete",
];
