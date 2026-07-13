import { z } from "zod";
import { USER_ROLES } from "@/constants/user";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(USER_ROLES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  role: z.enum(USER_ROLES),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
