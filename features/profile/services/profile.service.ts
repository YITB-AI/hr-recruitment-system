import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db/connect";
import { requireSession } from "@/lib/auth/session";
import { userRepository, type OwnProfileRow } from "@/server/repositories/user.repository";
import { companyRepository } from "@/server/repositories/company.repository";
import { notificationRepository } from "@/server/repositories/notification.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { triggerWebhook } from "@/lib/webhook";
import { saveFile, deleteFileByKey } from "@/lib/file-storage";
import type { UpdateProfileInput } from "@/validators/profile";
import type { ChangePasswordInput } from "@/validators/auth";

const AVATAR_FOLDER = "avatars";
const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;

export type OwnProfile = OwnProfileRow & { companyName: string };

export async function getOwnProfile(): Promise<OwnProfile> {
  const actor = await requireSession();
  await connectDB();
  const [profile, company] = await Promise.all([
    userRepository.findOwnProfile(actor.companyId, actor.id),
    companyRepository.findById(actor.companyId),
  ]);
  if (!profile) throw new Error("Profile not found");
  return { ...profile, companyName: company?.name ?? "—" };
}

export type ProfileActionResult = { success: true } | { success: false; error: string };

export async function updateOwnProfile(input: UpdateProfileInput): Promise<ProfileActionResult> {
  const actor = await requireSession();
  await connectDB();
  await userRepository.updateOwnProfile(actor.companyId, actor.id, {
    name: input.name.trim(),
    phone: input.phone?.trim() || "",
  });
  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "user.profile_updated",
    entityType: "user",
    entityId: actor.id,
    message: `${actor.name} updated their profile`,
  });
  return { success: true };
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function uploadOwnAvatar(file: File): Promise<ProfileActionResult> {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) return { success: false, error: "Only PNG, JPEG, or WEBP images are supported" };
  if (file.size > MAX_AVATAR_BYTES) return { success: false, error: "Image must be smaller than 5MB" };

  const actor = await requireSession();
  await connectDB();
  const existing = await userRepository.findOwnProfile(actor.companyId, actor.id);

  const buffer = Buffer.from(await file.arrayBuffer());
  const { storageKey } = await saveFile(AVATAR_FOLDER, file.name, buffer);
  const avatarUrl = `/api/files/${storageKey}`;

  await userRepository.updateOwnProfile(actor.companyId, actor.id, { avatarUrl });
  if (existing?.avatarUrl) await deleteFileByKey(existing.avatarUrl.replace("/api/files/", ""));

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "user.avatar_updated",
    entityType: "user",
    entityId: actor.id,
    message: `${actor.name} updated their profile picture`,
  });
  return { success: true };
}

// Shared by the forced first-login flow (actions/auth.ts's changeOwnPasswordAction,
// which redirects on success) and the account-settings flow (changePasswordFromProfileAction,
// which doesn't) — keeps the bcrypt/validation logic in exactly one place.
export async function changeOwnPassword(input: ChangePasswordInput): Promise<ProfileActionResult> {
  const actor = await requireSession();
  await connectDB();
  const user = await userRepository.findWithPasswordHash(actor.companyId, actor.id);
  if (!user) return { success: false, error: "User not found" };

  const currentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!currentValid) return { success: false, error: "Current password is incorrect" };

  const newHash = await bcrypt.hash(input.newPassword, 10);
  user.passwordHash = newHash;
  user.mustChangePassword = false;
  await user.save();

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "auth.password_changed",
    entityType: "auth",
    entityId: actor.id,
    message: `${actor.name} changed their password`,
  });
  return { success: true };
}

function generateVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function notifyAdminsOfEmailChange(
  companyId: string,
  actorId: string,
  actorName: string,
  oldEmail: string,
  newEmail: string,
): Promise<void> {
  // Best-effort on both fronts — the requesting user's own email-change flow
  // must never fail because an admin notification couldn't be delivered.
  try {
    const [admins, company] = await Promise.all([
      userRepository.findAdminsForCompany(companyId, actorId),
      companyRepository.findById(companyId),
    ]);
    if (admins.length === 0) return;

    await notificationRepository.createMany(
      admins.map((admin) => ({
        companyId,
        userId: admin._id,
        title: "Email change requested",
        message: `${actorName} changed their email from ${oldEmail} to ${newEmail}`,
      })),
    );

    await triggerWebhook("notify-admin-email-change", {
      adminEmails: admins.map((admin) => admin.email),
      userName: actorName,
      oldEmail,
      newEmail,
      companyName: company?.name ?? null,
      changedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to notify admins of email change:", error);
  }
}

export async function requestEmailChange(newEmail: string, currentPassword: string): Promise<ProfileActionResult> {
  const actor = await requireSession();
  await connectDB();
  const user = await userRepository.findWithPasswordHash(actor.companyId, actor.id);
  if (!user) return { success: false, error: "User not found" };

  const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordValid) return { success: false, error: "Current password is incorrect" };

  const normalizedEmail = newEmail.toLowerCase().trim();
  if (normalizedEmail === user.email) return { success: false, error: "That's already your current email" };
  if (await userRepository.isEmailTaken(normalizedEmail, actor.id)) {
    return { success: false, error: "That email is already in use" };
  }

  const code = generateVerificationCode();
  await userRepository.setPendingEmailChange(actor.companyId, actor.id, {
    pendingEmail: normalizedEmail,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  const sendResult = await triggerWebhook("send-verification-email", {
    to: normalizedEmail,
    code,
    userName: actor.name,
  });
  if (!sendResult.ok) return { success: false, error: `Failed to send the verification email: ${sendResult.error}` };

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "auth.email_change_requested",
    entityType: "auth",
    entityId: actor.id,
    message: `${actor.name} requested to change their email from ${user.email} to ${normalizedEmail}`,
  });

  await notifyAdminsOfEmailChange(actor.companyId, actor.id, actor.name, user.email, normalizedEmail);

  return { success: true };
}

export async function resendEmailChangeCode(): Promise<ProfileActionResult> {
  const actor = await requireSession();
  await connectDB();
  const user = await userRepository.findWithPasswordHash(actor.companyId, actor.id);
  if (!user?.pendingEmail) return { success: false, error: "No email change is in progress" };

  const sentAt = user.emailVerificationSentAt as Date | undefined;
  if (sentAt && Date.now() - sentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { success: false, error: "Please wait a moment before requesting another code" };
  }

  const code = generateVerificationCode();
  await userRepository.touchEmailVerificationResend(
    actor.companyId,
    actor.id,
    hashCode(code),
    new Date(Date.now() + CODE_TTL_MS),
  );

  const sendResult = await triggerWebhook("send-verification-email", {
    to: user.pendingEmail,
    code,
    userName: actor.name,
  });
  if (!sendResult.ok) return { success: false, error: `Failed to send the verification email: ${sendResult.error}` };

  return { success: true };
}

export type ConfirmEmailChangeResult = { success: true; newEmail: string } | { success: false; error: string };

export async function confirmEmailChange(code: string): Promise<ConfirmEmailChangeResult> {
  const actor = await requireSession();
  await connectDB();
  const user = await userRepository.findWithPasswordHash(actor.companyId, actor.id);
  const pendingEmail = user?.pendingEmail as string | undefined;
  if (!user || !pendingEmail) return { success: false, error: "No email change is in progress" };

  const expiresAt = user.emailVerificationExpiresAt as Date | undefined;
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    await userRepository.clearPendingEmailChange(actor.companyId, actor.id);
    return { success: false, error: "This code has expired. Request a new one." };
  }

  const attempts = (user.emailVerificationAttempts as number | undefined) ?? 0;
  if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
    await userRepository.clearPendingEmailChange(actor.companyId, actor.id);
    return { success: false, error: "Too many incorrect attempts. Request a new code." };
  }

  const providedHash = Buffer.from(hashCode(code));
  const storedHash = Buffer.from((user.emailVerificationCodeHash as string | undefined) ?? "");
  const isMatch = providedHash.length === storedHash.length && crypto.timingSafeEqual(providedHash, storedHash);
  if (!isMatch) {
    await userRepository.incrementEmailVerificationAttempts(actor.companyId, actor.id);
    return { success: false, error: "Invalid or expired code" };
  }

  if (await userRepository.isEmailTaken(pendingEmail, actor.id)) {
    await userRepository.clearPendingEmailChange(actor.companyId, actor.id);
    return { success: false, error: "That email is no longer available" };
  }

  const oldEmail = user.email;
  await userRepository.confirmEmailChange(actor.companyId, actor.id, pendingEmail);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "auth.email_changed",
    entityType: "auth",
    entityId: actor.id,
    message: `${actor.name} changed their email from ${oldEmail} to ${pendingEmail}`,
  });

  return { success: true, newEmail: pendingEmail };
}
