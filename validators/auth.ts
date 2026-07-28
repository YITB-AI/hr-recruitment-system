import { z } from "zod";

export const loginSchema = z.object({
  companySlug: z.string().min(1, "Company ID is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const PASSWORD_MIN = z.string().min(8, "Password must be at least 8 characters");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: PASSWORD_MIN,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: PASSWORD_MIN,
});
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

// Deliberately permissive on shape — a 6-digit TOTP code and a
// dash-formatted backup code look nothing alike, and the real validation
// (does this code actually match) happens in lib/mfa.ts, not here.
export const verifyMfaSchema = z.object({
  code: z.string().trim().min(1, "Enter your verification code").max(20, "Invalid code"),
  useBackupCode: z.boolean(),
});
export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;
