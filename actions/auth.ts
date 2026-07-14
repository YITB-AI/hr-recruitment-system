"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema, changePasswordSchema, adminResetPasswordSchema } from "@/validators/auth";
import { connectDB } from "@/server/db/connect";
import { User } from "@/models/User";
import { companyRepository } from "@/server/repositories/company.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { requireRole } from "@/lib/auth/permissions";
import { changeOwnPassword } from "@/features/profile/services/profile.service";
import {
  createUserSession,
  destroyCurrentSession,
  logoutAllForSelf,
  revokeAllSessionsForUser,
  requireSession,
} from "@/lib/auth/session";

export type LoginResult = { success: true } | { success: false; error: string };

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
// Never reveal *why* a login failed (unknown company/email vs wrong
// password vs locked-out-but-attempt-still-counted) beyond the lockout
// message itself — that distinction is exactly what lets an attacker
// enumerate valid companies/emails.
const GENERIC_ERROR: LoginResult = { success: false, error: "Invalid company, email, or password" };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    companySlug: String(formData.get("companySlug") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await connectDB();
  const company = await companyRepository.findBySlug(parsed.data.companySlug.toLowerCase().trim());
  if (!company || company.status !== "active") return GENERIC_ERROR;

  const email = parsed.data.email.toLowerCase().trim();
  const user = await User.findOne({ companyId: company._id, email });

  if (!user) {
    await activityLogRepository.create({
      companyId: company._id,
      action: "auth.login_failed",
      entityType: "auth",
      entityId: company._id,
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
    await User.updateOne(
      { _id: user._id },
      isNowLocked
        ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) }
        : { failedLoginAttempts: attempts },
    );
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

  await User.updateOne(
    { _id: user._id },
    { failedLoginAttempts: 0, lastLoginAt: new Date(), $unset: { lockedUntil: "" } },
  );

  const headerStore = await headers();
  await createUserSession({
    userId: String(user._id),
    companyId: String(company._id),
    userAgent: headerStore.get("user-agent") ?? undefined,
    ipAddress: headerStore.get("x-forwarded-for") ?? undefined,
    rememberMe: formData.get("rememberMe") === "on",
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

  redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
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

  redirect("/dashboard");
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
  const target = await User.findOne({ _id: parsed.data.userId, companyId: actor.companyId });
  if (!target) return { success: false, error: "User not found" };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await User.updateOne(
    { _id: target._id },
    { passwordHash: newHash, mustChangePassword: true, failedLoginAttempts: 0, $unset: { lockedUntil: "" } },
  );
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
  const user = await requireSession();
  await destroyCurrentSession();
  // The session is already destroyed at this point — an audit-log failure
  // (e.g. a transient DB error) must never block the redirect and leave the
  // user stuck on an authenticated-looking error page.
  await activityLogRepository
    .create({
      companyId: user.companyId,
      actorId: user.id,
      actorName: user.name,
      action: "auth.logout",
      entityType: "auth",
      entityId: user.id,
      message: `${user.name} logged out`,
    })
    .catch((error) => console.error("Failed to write logout activity log:", error));
  redirect("/login");
}

export async function logoutAllAction(): Promise<never> {
  const user = await requireSession();
  await logoutAllForSelf(user.id);
  await activityLogRepository
    .create({
      companyId: user.companyId,
      actorId: user.id,
      actorName: user.name,
      action: "auth.logout_all",
      entityType: "auth",
      entityId: user.id,
      message: `${user.name} logged out of all devices`,
    })
    .catch((error) => console.error("Failed to write logout-all activity log:", error));
  redirect("/login");
}
