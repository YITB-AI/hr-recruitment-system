import { z } from "zod";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES } from "@/constants/employee";

/**
 * Shared create/edit schema for the Employee form. Used on both the client
 * (react-hook-form + zodResolver, for instant validation) and the server
 * action (re-validated there too, since client-side checks can be bypassed).
 */
export const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  managerId: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  basicSalary: z.number().positive("Must be greater than 0"),
  grossSalary: z.number().positive("Must be greater than 0"),
});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
