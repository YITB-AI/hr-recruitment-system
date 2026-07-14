import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/server/db/connect";
import { Company } from "@/models/Company";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
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
export async function getCurrentUser(): Promise<SessionUser> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return getSystemUser();
  }

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) redirect("/login");
  return user;
}
