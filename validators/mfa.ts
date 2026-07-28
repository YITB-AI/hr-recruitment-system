import { z } from "zod";

export const confirmMfaSchema = z.object({
  code: z.string().trim().min(1, "Enter the code from your app").max(10, "Invalid code"),
});
export type ConfirmMfaInput = z.infer<typeof confirmMfaSchema>;

export const disableMfaSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});
export type DisableMfaInput = z.infer<typeof disableMfaSchema>;
