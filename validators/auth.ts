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
