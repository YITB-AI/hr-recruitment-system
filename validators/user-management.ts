import { z } from "zod";

// role is a real, existing Role.key, not one of a fixed compile-time set —
// checked against the live Role collection at the service layer
// (roleRepository.findByKey), the same FK-existence pattern already used
// for Department/EmployeeType, not a zod enum.
export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.string().min(1, "Role is required"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
