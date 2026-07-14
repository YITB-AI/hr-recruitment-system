"use server";

import {
  requestStartImpersonation,
  requestEndImpersonation,
  type ImpersonationResult,
} from "@/features/settings/services/impersonation.service";

// Deliberately no redirect() here, unlike most other actions in this
// codebase — the caller does a hard `window.location` navigation instead
// (see users-table.tsx / impersonation-banner.tsx). Both of these swap
// which session the "session" cookie points to; when the caller happens to
// already be on the destination path (returning from impersonation nearly
// always lands back on /dashboard, which is also where impersonation
// itself starts), a same-path redirect() doesn't reliably force Next's
// client router to re-fetch the tree, so the old (wrong) user can stay
// visible until an unrelated navigation happens. A full reload has no such
// ambiguity — appropriate here since this is a security-sensitive session
// swap, not just a UX nicety.
export async function startImpersonationAction(targetUserId: string): Promise<ImpersonationResult> {
  return requestStartImpersonation(targetUserId);
}

export async function endImpersonationAction(): Promise<ImpersonationResult> {
  return requestEndImpersonation();
}
