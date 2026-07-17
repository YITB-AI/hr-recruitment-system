import { z } from "zod";

export const createEmployeeTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  parentTypeId: z.string().optional(),
});
export type CreateEmployeeTypeInput = z.infer<typeof createEmployeeTypeSchema>;

export const updateEmployeeTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  parentTypeId: z.string().nullable().optional(),
});
export type UpdateEmployeeTypeInput = z.infer<typeof updateEmployeeTypeSchema>;

export const reorderEmployeeTypesSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderEmployeeTypesInput = z.infer<typeof reorderEmployeeTypesSchema>;
