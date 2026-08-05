import { z } from "zod";
import { PERMISSION_ACTIONS } from "@/lib/auth/permissions";

const keyPattern = /^[a-z][a-z0-9_]*$/;

export const createRoleSchema = z.object({
  key: z.string().trim().min(1, "Key is required").regex(keyPattern, "Key must be lowercase letters, numbers, and underscores only, starting with a letter"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500).optional().default(""),
  permissions: z.array(z.enum(PERMISSION_ACTIONS)).default([]),
  isWildcard: z.boolean().default(false),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500).optional().default(""),
  permissions: z.array(z.enum(PERMISSION_ACTIONS)).default([]),
  isWildcard: z.boolean().default(false),
});
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
