"use server";

import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { connectDB } from "@/server/db/connect";
import { userRepository } from "@/server/repositories/user.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { generateTotpSecret, buildTotpUri, verifyTotpCode, generateBackupCodes, hashBackupCodes } from "@/lib/mfa";
import { confirmMfaSchema, disableMfaSchema } from "@/validators/mfa";

export type StartMfaEnrollmentResult = { success: true; qrCodeDataUrl: string; secret: string } | { success: false; error: string };

// Writes mfaSecretEncrypted immediately (mfaEnabled stays false) — an
// abandoned attempt just leaves an unused secret behind, overwritten by the
// next call. See models/User.ts's header comment.
export async function startMfaEnrollmentAction(): Promise<StartMfaEnrollmentResult> {
  const actor = await requireSession();
  await connectDB();

  const secret = generateTotpSecret();
  await userRepository.startMfaEnrollment(actor.companyId, actor.id, encryptSecret(secret));

  const qrCodeDataUrl = await QRCode.toDataURL(buildTotpUri(secret, actor.email));
  return { success: true, qrCodeDataUrl, secret };
}

export type ConfirmMfaEnrollmentResult = { success: true; backupCodes: string[] } | { success: false; error: string };

export async function confirmMfaEnrollmentAction(formData: FormData): Promise<ConfirmMfaEnrollmentResult> {
  const parsed = confirmMfaSchema.safeParse({ code: String(formData.get("code") ?? "") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const actor = await requireSession();
  await connectDB();

  const user = await userRepository.findRawByCompanyAndId(actor.companyId, actor.id);
  if (!user?.mfaSecretEncrypted) return { success: false, error: "Start enrollment first" };

  const secret = decryptSecret(user.mfaSecretEncrypted);
  if (!verifyTotpCode(secret, actor.email, parsed.data.code)) {
    return { success: false, error: "Invalid code. Please try again." };
  }

  const backupCodes = generateBackupCodes();
  await userRepository.confirmMfaEnrollment(actor.companyId, actor.id, await hashBackupCodes(backupCodes));

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "auth.mfa_enabled",
    entityType: "auth",
    entityId: actor.id,
    message: `${actor.name} enabled two-factor authentication`,
  });

  revalidatePath("/profile");
  revalidatePath("/mfa-setup");
  return { success: true, backupCodes };
}

export type DisableMfaResult = { success: true } | { success: false; error: string };

export async function disableMfaAction(formData: FormData): Promise<DisableMfaResult> {
  const parsed = disableMfaSchema.safeParse({ currentPassword: String(formData.get("currentPassword") ?? "") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const actor = await requireSession();
  await connectDB();

  const user = await userRepository.findRawByCompanyAndId(actor.companyId, actor.id);
  if (!user) return { success: false, error: "User not found" };

  const passwordValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!passwordValid) return { success: false, error: "Incorrect password" };

  await userRepository.disableMfa(actor.companyId, actor.id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id,
    actorName: actor.name,
    action: "auth.mfa_disabled",
    entityType: "auth",
    entityId: actor.id,
    message: `${actor.name} disabled two-factor authentication`,
  });

  revalidatePath("/profile");
  return { success: true };
}
