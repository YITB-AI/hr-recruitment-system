"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { loginSchema, changePasswordSchema, adminResetPasswordSchema, verifyMfaSchema } from "@/validators/auth";
import { connectDB } from "@/server/db/connect";
import { userRepository } from "@/server/repositories/user.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { roleRepository } from "@/server/repositories/role.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { requireRole } from "@/lib/auth/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { decryptSecret } from "@/lib/crypto";
import { verifyTotpCode, findAndConsumeBackupCode } from "@/lib/mfa";
import { changeOwnPassword } from "@/features/profile/services/profile.service";
import { getCurrentUser } from "@/lib/current-user";
import {
  createUserSession,
  destroyCurrentSession,
  logoutAllForSelf,
  revokeAllSessionsForUser,
  requireSession,
} from "@/lib/auth/session";
import { MFA_PENDING_COOKIE_NAME, createMfaPendingToken, verifyMfaPendingToken } from "@/lib/auth/mfa-pending-token";

export type LoginResult = { success: true } | { success: false; error: string };

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
// Never reveal *why* a login failed (unknown company/email vs wrong
// password vs locked-out-but-attempt-still-counted) beyond the lockout
// message itself — that distinction is exactly what lets an attacker
// enumerate valid companies/emails.
const GENERIC_ERROR: LoginResult = { success: false, error: "Invalid company, email, or password" };

// IP-based, on top of the existing per-account lockout above — the
// lockout defends one account against many attempts; this defends against
// many-accounts-from-one-IP (credential stuffing/spraying) attacks the
// per-account lockout can't see at all.
const LOGIN_RATE_LIMIT = 15;
const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_ERROR: LoginResult = { success: false, error: "Too many login attempts. Please try again in a few minutes." };
const CAPTCHA_ERROR: LoginResult = { success: false, error: "Please complete the verification check and try again." };
const MFA_PENDING_COOKIE_MAX_AGE_S = 5 * 60;

function mfaPendingCookieOptions(maxAgeS: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeS,
  };
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    companySlug: String(formData.get("companySlug") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // headers() read once, reused below for both the rate-limit key and (on
  // success) the session's recorded user-agent/IP — avoids a second call.
  const headerStore = await headers();
  const clientIp = getClientIp(headerStore);
  const rateLimit = await checkRateLimit(`login:${clientIp}`, LOGIN_RATE_LIMIT, LOGIN_RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) return RATE_LIMIT_ERROR;

  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");
  const captchaValid = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!captchaValid) return CAPTCHA_ERROR;

  await connectDB();
  const email = parsed.data.email.toLowerCase().trim();
  const companySlug = parsed.data.companySlug.toLowerCase().trim();

  // Two resolution paths: a regular user must supply their real Company ID
  // (tenant-scoped lookup, unchanged from before); a platform admin
  // operates across every company, not one tenant, so they may leave it
  // blank and resolve by email alone -- but ONLY a genuine
  // isPlatformAdmin:true account can ever succeed that way (enforced by
  // the query itself, not a post-check), so this can't become a shortcut
  // for a regular user who simply doesn't know their Company ID.
  let user;
  let company;
  if (companySlug) {
    company = await companyRepository.findBySlug(companySlug);
    if (!company || company.status !== "active") return GENERIC_ERROR;
    user = await userRepository.findForLogin(String(company._id), email);
  } else {
    user = await userRepository.findPlatformAdminByEmail(email);
    company = user ? await companyRepository.findById(String(user.companyId)) : null;
  }

  if (!user || !company) {
    await activityLogRepository.create({
      companyId: company?._id,
      action: "auth.login_failed",
      entityType: "auth",
      entityId: company?._id,
      message: `Failed login attempt for unknown email ${email}`,
    });
    return GENERIC_ERROR;
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { success: false, error: "Too many failed attempts. Try again in a few minutes." };
  }

  const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordValid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const isNowLocked = attempts >= MAX_FAILED_ATTEMPTS;
    await userRepository.recordLoginFailure(String(user._id), isNowLocked ? 0 : attempts, isNowLocked ? new Date(Date.now() + LOCKOUT_MS) : undefined);
    await activityLogRepository.create({
      companyId: company._id,
      actorId: user._id,
      actorName: user.name,
      action: "auth.login_failed",
      entityType: "auth",
      entityId: user._id,
      message: `${user.name} entered an incorrect password${isNowLocked ? " — account locked for 15 minutes" : ""}`,
    });
    return GENERIC_ERROR;
  }

  await userRepository.recordLoginSuccess(String(user._id));
  const rememberMe = formData.get("rememberMe") === "on";

  // MFA-enrolled users don't get a real session yet — password correct is
  // only the first factor. See lib/auth/mfa-pending-token.ts for why this
  // is a short-lived signed cookie rather than a Session row.
  if (user.mfaEnabled) {
    const pendingToken = createMfaPendingToken({
      userId: String(user._id),
      companyId: String(company._id),
      rememberMe,
      userAgent: headerStore.get("user-agent") ?? undefined,
      ipAddress: clientIp,
    });
    const cookieStore = await cookies();
    cookieStore.set(MFA_PENDING_COOKIE_NAME, pendingToken, mfaPendingCookieOptions(MFA_PENDING_COOKIE_MAX_AGE_S));
    redirect("/login/verify-mfa");
  }

  await createUserSession({
    userId: String(user._id),
    companyId: String(company._id),
    userAgent: headerStore.get("user-agent") ?? undefined,
    ipAddress: clientIp,
    rememberMe,
  });

  await activityLogRepository.create({
    companyId: company._id,
    actorId: user._id,
    actorName: user.name,
    action: "auth.login_success",
    entityType: "auth",
    entityId: user._id,
    message: `${user.name} logged in`,
  });

  // mustChangePassword is checked FIRST — a freshly-provisioned admin
  // (mustChangePassword: true, mfaSetupCompletedAt unset) must set a real
  // password before anything else, including MFA enrollment. Accounts with
  // wildcard (admin-equivalent) permissions must also have completed MFA
  // enrollment at least once, ever — checked via mfaSetupCompletedAt
  // (survives a later disable), not the toggleable mfaEnabled, so disabling
  // MFA afterward never re-forces this page. This is a one-time nudge right
  // after login; app/(app)/layout.tsx enforces the same two checks on every
  // subsequent request so neither can be bypassed by navigating straight to
  // a URL instead of following the redirect.
  //
  // Wildcard permissions, not the literal role key "admin" -- a custom role
  // created with isWildcard:true (see /platform/roles) must be forced
  // through this exactly like the built-in admin role is. This runs after
  // password verification, session creation, and the login-success audit
  // log above, so it can't weaken any of the enumeration-safe/timing-
  // sensitive early-return branches earlier in this function.
  if (user.mustChangePassword) redirect("/change-password");
  const requiresMfaSetup = await roleRepository.isWildcardKey(user.role);
  if (requiresMfaSetup && !user.mfaSetupCompletedAt) redirect("/mfa-setup");
  // A platform admin's "home" is the Global Super Admin workspace, not
  // their own company's tenant dashboard — they can always switch to the
  // tenant view via the link in that workspace's sidebar.
  redirect(user.isPlatformAdmin ? "/platform/dashboard" : "/dashboard");
}

// Second factor for accounts with MFA enrolled — reads the short-lived
// pending cookie loginAction set, verifies a TOTP code or a single-use
// backup code, and only then actually creates the real session.
export async function verifyMfaAction(formData: FormData): Promise<LoginResult> {
  const cookieStore = await cookies();
  const pendingToken = cookieStore.get(MFA_PENDING_COOKIE_NAME)?.value;
  const pending = pendingToken ? verifyMfaPendingToken(pendingToken) : null;
  if (!pending) {
    cookieStore.delete(MFA_PENDING_COOKIE_NAME);
    return { success: false, error: "Your session expired. Please log in again." };
  }

  const parsed = verifyMfaSchema.safeParse({
    code: String(formData.get("code") ?? ""),
    useBackupCode: formData.get("useBackupCode") === "on",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const headerStore = await headers();
  const clientIp = getClientIp(headerStore);
  const rateLimit = await checkRateLimit(`mfa-verify:${clientIp}`, LOGIN_RATE_LIMIT, LOGIN_RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) return RATE_LIMIT_ERROR;

  await connectDB();
  const user = await userRepository.findRawByCompanyAndId(pending.companyId, pending.userId);
  if (!user || !user.mfaEnabled) {
    cookieStore.delete(MFA_PENDING_COOKIE_NAME);
    return { success: false, error: "Your session expired. Please log in again." };
  }

  let verified = false;
  if (parsed.data.useBackupCode) {
    const { matched, remainingHashes } = await findAndConsumeBackupCode(user.mfaBackupCodeHashes ?? [], parsed.data.code);
    if (matched) {
      verified = true;
      await userRepository.consumeMfaBackupCode(String(user._id), remainingHashes);
    }
  } else if (user.mfaSecretEncrypted) {
    verified = verifyTotpCode(decryptSecret(user.mfaSecretEncrypted), user.email, parsed.data.code);
  }

  if (!verified) {
    await activityLogRepository.create({
      companyId: pending.companyId,
      actorId: user._id,
      actorName: user.name,
      action: "auth.mfa_failed",
      entityType: "auth",
      entityId: user._id,
      message: `${user.name} entered an incorrect MFA code`,
    });
    return { success: false, error: "Invalid code. Please try again." };
  }

  cookieStore.delete(MFA_PENDING_COOKIE_NAME);
  await createUserSession({
    userId: pending.userId,
    companyId: pending.companyId,
    userAgent: pending.userAgent,
    ipAddress: pending.ipAddress,
    rememberMe: pending.rememberMe,
  });

  await activityLogRepository.create({
    companyId: pending.companyId,
    actorId: user._id,
    actorName: user.name,
    action: "auth.login_success",
    entityType: "auth",
    entityId: user._id,
    message: `${user.name} logged in (MFA verified)`,
  });

  if (user.mustChangePassword) redirect("/change-password");
  redirect(user.isPlatformAdmin ? "/platform/dashboard" : "/dashboard");
}

export type ChangePasswordResult = { success: true } | { success: false; error: string };

// Self-service — the logged-in user changes their own password (used both
// for the forced first-login flow and, later, from account settings).
// Verifies the current password first; an admin-issued reset (below) skips
// that check since the admin doesn't know it.
export async function changeOwnPasswordAction(formData: FormData): Promise<ChangePasswordResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await changeOwnPassword(parsed.data);
  if (!result.success) return result;

  // This action is also the forced first-login flow's redirect target
  // (app/(auth)/change-password/page.tsx) — check mfaSetupRequired next,
  // same ordering as loginAction, instead of relying solely on the shared
  // layouts' own enforcement to catch it one hop later.
  const user = await getCurrentUser();
  if (user.mfaSetupRequired) redirect("/mfa-setup");
  redirect(user.isPlatformAdmin ? "/platform/dashboard" : "/dashboard");
}

export type AdminResetPasswordResult = { success: true } | { success: false; error: string };

// Admin-only, no email round-trip (Phase 1 decision — no SMTP integration
// exists yet). The admin sets the new password directly; the target user
// must change it again on next login, and every existing session for that
// user is revoked so a stale/compromised session can't outlive the reset.
export async function adminResetPasswordAction(input: unknown): Promise<AdminResetPasswordResult> {
  const parsed = adminResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await requireSession();
  try {
    requireRole(actor, "user.manage");
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Forbidden" };
  }

  await connectDB();
  const target = await userRepository.findRawByCompanyAndId(actor.companyId, parsed.data.userId);
  if (!target) return { success: false, error: "User not found" };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await userRepository.resetPassword(actor.companyId, String(target._id), newHash);
  await revokeAllSessionsForUser(String(target._id));

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "user.password_reset",
    entityType: "auth",
    entityId: target._id,
    message: `${actor.name} reset ${target.name}'s password`,
  });

  return { success: true };
}

export async function logoutAction(): Promise<never> {
  // requireSession() (identity) and destroyCurrentSession() (token revocation)
  // don't depend on each other's result — destroyCurrentSession reads the raw
  // cookie token itself, not the resolved user — so run them concurrently
  // instead of one after another.
  const [user] = await Promise.all([requireSession(), destroyCurrentSession()]);
  // The session is already destroyed at this point. Audit logging is
  // mandatory (see SECURITY_STANDARDS.md) but must never block the redirect
  // the user is waiting on — after() defers the write until the response has
  // gone out while still guaranteeing (via Vercel's waitUntil) that it runs
  // to completion, unlike a bare un-awaited promise that a serverless
  // function could get torn down before finishing.
  after(() =>
    activityLogRepository
      .create({
        companyId: user.companyId,
        actorId: user.id,
        actorName: user.name,
        action: "auth.logout",
        entityType: "auth",
        entityId: user.id,
        message: `${user.name} logged out`,
      })
      .catch((error) => console.error("Failed to write logout activity log:", error)),
  );
  redirect("/login");
}

export async function logoutAllAction(): Promise<never> {
  const user = await requireSession();
  await logoutAllForSelf(user.id);
  after(() =>
    activityLogRepository
      .create({
        companyId: user.companyId,
        actorId: user.id,
        actorName: user.name,
        action: "auth.logout_all",
        entityType: "auth",
        entityId: user.id,
        message: `${user.name} logged out of all devices`,
      })
      .catch((error) => console.error("Failed to write logout-all activity log:", error)),
  );
  redirect("/login");
}
