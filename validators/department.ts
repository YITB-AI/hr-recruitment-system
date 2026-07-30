import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  // "Department Code" from the Employee Module Enhancement's requested
  // column list — optional, since most departments never need one.
  code: z.string().max(20, "Code is too long").optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  code: z.string().max(20, "Code is too long").optional(),
});
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const reorderDepartmentsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderDepartmentsInput = z.infer<typeof reorderDepartmentsSchema>;
