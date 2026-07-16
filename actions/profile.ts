"use server";

import { revalidatePath } from "next/cache";
import { updateProfileSchema, requestEmailChangeSchema, verifyEmailChangeSchema } from "@/validators/profile";
import { changePasswordSchema } from "@/validators/auth";
import {
  updateOwnProfile,
  uploadOwnAvatar,
  changeOwnPassword,
  requestEmailChange,
  resendEmailChangeCode,
  confirmEmailChange,
  requestOwnEmailVerification,
  confirmOwnEmailVerification,
  type ProfileActionResult,
  type ConfirmEmailChangeResult,
} from "@/features/profile/services/profile.service";

export async function updateProfileAction(input: unknown): Promise<ProfileActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await updateOwnProfile(parsed.data);
    revalidatePath("/profile");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update profile" };
  }
}

export async function uploadAvatarAction(formData: FormData): Promise<ProfileActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choose an image file first" };

  try {
    const result = await uploadOwnAvatar(file);
    revalidatePath("/profile");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload image" };
  }
}

export async function changePasswordFromProfileAction(formData: FormData): Promise<ProfileActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    return await changeOwnPassword(parsed.data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to change password" };
  }
}

export async function requestEmailChangeAction(input: unknown): Promise<ProfileActionResult> {
  const parsed = requestEmailChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await requestEmailChange(parsed.data.newEmail, parsed.data.currentPassword);
    revalidatePath("/profile");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to request email change" };
  }
}

export async function resendEmailChangeCodeAction(): Promise<ProfileActionResult> {
  try {
    return await resendEmailChangeCode();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to resend the code" };
  }
}

export async function confirmEmailChangeAction(input: unknown): Promise<ConfirmEmailChangeResult> {
  const parsed = verifyEmailChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await confirmEmailChange(parsed.data.code);
    revalidatePath("/profile");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to verify email" };
  }
}

export async function requestOwnEmailVerificationAction(): Promise<ProfileActionResult> {
  try {
    const result = await requestOwnEmailVerification();
    revalidatePath("/profile");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send verification email" };
  }
}

export async function confirmOwnEmailVerificationAction(input: unknown): Promise<ProfileActionResult> {
  const parsed = verifyEmailChangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await confirmOwnEmailVerification(parsed.data.code);
    revalidatePath("/profile");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to verify email" };
  }
}
