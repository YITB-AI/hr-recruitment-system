import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  phone: z
    .string()
    .max(30, "Phone number is too long")
    .optional()
    .or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().min(1, "New email is required").email("Enter a valid email"),
  currentPassword: z.string().min(1, "Current password is required"),
});
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;

export const verifyEmailChangeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type VerifyEmailChangeInput = z.infer<typeof verifyEmailChangeSchema>;
