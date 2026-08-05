import { z } from "zod";

export const grantPlatformAdminSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
export type GrantPlatformAdminInput = z.infer<typeof grantPlatformAdminSchema>;
