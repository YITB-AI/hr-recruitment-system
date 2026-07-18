import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
import { verifySession } from "@/lib/auth/session";
import type { SessionUser } from "@/types/user";

// Used purely for audit-log attribution when code runs outside a real
// Next.js request — standalone scripts like scripts/seed.ts and
// scripts/migrate-tenancy.ts, where cookies()/headers() aren't callable at
// all (they throw, not return empty). There is no "current user" concept in
// a script; this is not a security boundary and must never be treated as one.
// companyId is resolved to any real Company row that exists (scripts are
// single-operator dev tools, not multi-tenant-aware) — a hardcoded "" here
// would make every companyId-scoped write (e.g. scripts/seed.ts calling
// createTemplate/generateDocument) fail with a Mongoose CastError instead of
// actually writing usable data.
async function getSystemUser(): Promise<SessionUser> {
  await connectDB();
  const anyCompany = await Company.findOne().lean<{ _id: unknown } | null>();
  return {
    id: "system",
    companyId: anyCompany ? String(anyCompany._id) : "",
    name: "System",
    email: "system@internal",
    role: "admin",
    avatarUrl: null,
    isPlatformAdmin: true,
    impersonatedBy: null,
  };
}

// Real session-backed auth (Phase 1). Every existing call site still just
// does `const actor = await getCurrentUser()` and reads id/name/email/role/
// avatarUrl — this keeps returning that exact shape, so none of them need
// to change. The one behavior change: a real, unauthenticated web request
// now gets redirected to /login instead of silently getting a placeholder
// user, matching Next's documented DAL pattern (redirect happens here, not
// in proxy.ts, which only does an optimistic cookie-presence check).
//
// Routed through verifySession() (React cache()-wrapped) rather than
// calling cookies()/verifySessionToken() directly — this function is
// called from dozens of independent service functions per page render
// (AppShell's layout, plus every service a page's data-fetching Promise.all
// touches), and calling verifySessionToken directly here meant every one of
// those was a fresh, uncached DB round trip: a single applicant detail page
// render was measured doing ~10 independent session/user lookups. cache()
// dedupes all of those into one within a single render pass.
export async function getCurrentUser(): Promise<SessionUser> {
  // Only a script context (cookies() throws outside a real request) falls
  // back to the system user — a genuine downstream error (e.g. a DB blip
  // inside verifySession) must keep propagating as a real error, not get
  // silently swallowed into "running as System" (isPlatformAdmin: true).
  try {
    await cookies();
  } catch {
    return getSystemUser();
  }

  const user = await verifySession();
  if (!user) redirect("/login");
  return user;
}
