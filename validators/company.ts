import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().min(1, "Admin email is required").email("Enter a valid email"),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
