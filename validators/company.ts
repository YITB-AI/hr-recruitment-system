import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().min(1, "Admin email is required").email("Enter a valid email"),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1, "Company name is required"),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const setCompanyStatusSchema = z.object({
  companyId: z.string().min(1),
  status: z.enum(["active", "suspended"]),
});
export type SetCompanyStatusInput = z.infer<typeof setCompanyStatusSchema>;
