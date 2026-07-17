import { z } from "zod";
import { EMPLOYMENT_TYPES } from "@/constants/employee";

/**
 * Shared create/edit schema for the Employee form. Used on both the client
 * (react-hook-form + zodResolver, for instant validation) and the server
 * action (re-validated there too, since client-side checks can be bypassed).
 */
export const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().optional(),
  // References a real Department master row (see models/Department.ts) —
  // the free-text era is over; employee.service.ts resolves this to the
  // department's name and writes both fields on every create/update.
  departmentId: z.string().min(1, "Department is required"),
  // New position/role-level master (see models/EmployeeType.ts) — optional,
  // independent of employmentType below.
  employeeTypeId: z.string().optional(),
  designation: z.string().min(1, "Designation is required"),
  managerId: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  // No longer a static enum — validated against this company's own
  // Status collection at the service layer (see employee.service.ts).
  employmentStatus: z.string().min(1, "Status is required"),
  basicSalary: z.number().positive("Must be greater than 0"),
  grossSalary: z.number().positive("Must be greater than 0"),
});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
