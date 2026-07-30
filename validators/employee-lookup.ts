import { z } from "zod";
import { EMPLOYEE_LOOKUP_KINDS } from "@/constants/employee-lookup";

const kindSchema = z.enum(EMPLOYEE_LOOKUP_KINDS);

export const createEmployeeLookupSchema = z.object({
  kind: kindSchema,
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  code: z.string().max(20, "Code is too long").optional().or(z.literal("")),
});
export type CreateEmployeeLookupInput = z.infer<typeof createEmployeeLookupSchema>;

export const updateEmployeeLookupSchema = z.object({
  kind: kindSchema,
  id: z.string().min(1),
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  code: z.string().max(20, "Code is too long").optional().or(z.literal("")),
});
export type UpdateEmployeeLookupInput = z.infer<typeof updateEmployeeLookupSchema>;

export const reorderEmployeeLookupSchema = z.object({
  kind: kindSchema,
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderEmployeeLookupInput = z.infer<typeof reorderEmployeeLookupSchema>;
