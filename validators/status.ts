import { z } from "zod";
import { STATUS_MODULES } from "@/constants/status-module";

export const createStatusSchema = z.object({
  module: z.enum(STATUS_MODULES),
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
  icon: z.string().optional(),
});
export type CreateStatusInput = z.infer<typeof createStatusSchema>;

export const updateStatusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required").max(60, "Name is too long"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color"),
  icon: z.string().optional(),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const reorderStatusesSchema = z.object({
  module: z.enum(STATUS_MODULES),
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderStatusesInput = z.infer<typeof reorderStatusesSchema>;
