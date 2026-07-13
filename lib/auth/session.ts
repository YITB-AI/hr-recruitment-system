import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/server/db/connect";
import { User } from "@/models/User";
import { sessionRepository } from "@/server/repositories/session.repository";
import type { UserRole } from "@/models/User";
import type { SessionUser } from "@/types/user";

export const SESSION_COOKIE_NAME = "session";

const ABSOLUTE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const IDLE_TTL_MS = 30 * 60 * 1000; // 30min — unaffected by "remember me"; true inactivity still ends the session

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newSessionExpiry(rememberMe = false): Date {
  return new Date(Date.now() + (rememberMe ? REMEMBER_ME_TTL_MS : ABSOLUTE_TTL_MS));
}

type RawUser = {
  _id: unknown;
  companyId?: unknown;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isPlatformAdmin?: boolean;
};

// The authoritative check — proxy.ts only does an optimistic cookie-presence
// check (see Next's own documented guidance that Proxy must not be the sole
// enforcement layer). This looks the session up in the database and confirms
// it's unexpired/unrevoked/not idle-timed-out. Returns null for "not
// authenticated" rather than throwing/redirecting — callers (getCurrentUser)
// decide what to do with that.
//
// Tenant resolution note: this app originally resolved the active company
// from the request's subdomain (acme.dax-hr.vercel.app), but that requires a
// custom domain with real DNS control — subdomains of the shared
// *.vercel.app alias can't get a valid wildcard TLS certificate (confirmed
// by an actual failed handshake against a deployed subdomain, not just a
// DNS lookup). Switched to session-derived resolution instead: the company
// is chosen once at login (see actions/auth.ts's companySlug field) and
// companyId then lives entirely in the session row — no per-request domain
// parsing needed. Revisit subdomain resolution if/when a real custom domain
// is added.
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  await connectDB();

  const tokenHash = hashSessionToken(token);
  const session = await sessionRepository.findByTokenHash(tokenHash);
  if (!session || session.revokedAt) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() < now) return null;
  if (now - session.lastActiveAt.getTime() > IDLE_TTL_MS) return null;

  const user = await User.findById(session.userId).lean<RawUser | null>();
  if (!user) return null;
  if (user.companyId && String(user.companyId) !== String(session.companyId)) return null;

  await sessionRepository.touchLastActive(String(session._id));

  return {
    id: String(user._id),
    companyId: String(user.companyId ?? session.companyId),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    isPlatformAdmin: Boolean(user.isPlatformAdmin),
  };
}

// Reads the session cookie for the current request and verifies it. Wrapped
// in React's cache() so multiple calls during one render pass only hit the
// DB once. Must only be called from inside a real Next.js request (Server
// Component/Action/Route Handler) — cookies() throws otherwise; see
// lib/current-user.ts for the script-safe wrapper every service actually calls.
export const verifySession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
});

// Authoritative, redirect-on-failure variant for pages/actions that require
// a logged-in user (matches Next's documented DAL pattern). Prefer this over
// verifySession() directly whenever the caller has no script-context concern.
export async function requireSession(): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) redirect("/login");
  return user;
}

export async function createUserSession(input: {
  userId: string;
  companyId: string;
  userAgent?: string;
  ipAddress?: string;
  rememberMe?: boolean;
}): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = newSessionExpiry(input.rememberMe);
  await sessionRepository.create({
    userId: input.userId,
    companyId: input.companyId,
    tokenHash: hashSessionToken(token),
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) await sessionRepository.revoke(hashSessionToken(token));
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Pure DB revocation, no cookie side effect — safe to call for a DIFFERENT
// user than the caller (e.g. an admin resetting someone else's password).
// Use logoutAllForSelf below when the caller is revoking their own sessions
// and also needs their own cookie cleared.
export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  return sessionRepository.revokeAllForUser(userId);
}

export async function logoutAllForSelf(userId: string): Promise<number> {
  const count = await revokeAllSessionsForUser(userId);
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return count;
}
