import { z } from "zod";
import { JOB_STATUSES, JOB_TYPES, EXPERIENCE_LEVELS, WORK_MODES, JOB_SALARY_CURRENCIES } from "@/constants/job";

const salaryRangeRefinement = <T extends { salaryMin?: number; salaryMax?: number }>(data: T) =>
  data.salaryMin == null || data.salaryMax == null || data.salaryMin <= data.salaryMax;

export const createJobSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    department: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    status: z.enum(JOB_STATUSES),
    type: z.enum(JOB_TYPES),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
    salaryCurrency: z.enum(JOB_SALARY_CURRENCIES).optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    workMode: z.enum(WORK_MODES).optional(),
    skills: z.array(z.string()).optional(),
    responsibilities: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
  })
  .refine(salaryRangeRefinement, { message: "Minimum salary can't exceed maximum salary", path: ["salaryMax"] });
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = z
  .object({
    jobId: z.string().min(1),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    department: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    status: z.enum(JOB_STATUSES),
    type: z.enum(JOB_TYPES),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
    salaryCurrency: z.enum(JOB_SALARY_CURRENCIES).optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    workMode: z.enum(WORK_MODES).optional(),
    skills: z.array(z.string()).optional(),
    responsibilities: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
  })
  .refine(salaryRangeRefinement, { message: "Minimum salary can't exceed maximum salary", path: ["salaryMax"] });
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
