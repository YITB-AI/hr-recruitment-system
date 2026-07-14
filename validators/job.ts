import { z } from "zod";
import { JOB_STATUSES, JOB_TYPES } from "@/constants/job";

export const createJobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  department: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(JOB_STATUSES),
  type: z.enum(JOB_TYPES),
});
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = z.object({
  jobId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  department: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(JOB_STATUSES),
  type: z.enum(JOB_TYPES),
});
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
