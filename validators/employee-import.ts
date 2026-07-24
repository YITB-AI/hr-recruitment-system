import { z } from "zod";

// Every reference field here is a human-readable NAME (department/employee
// type/status/employment type), not an internal id/key — the import file
// asks HR for names, and employee-import.service.ts resolves each one
// against this company's real master data before a row is considered valid.
export const employeeImportRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  employeeType: z.string().optional(),
  managerEmployeeCode: z.string().optional(),
  joiningDate: z.string().min(1, "Joining date is required"),
  employmentType: z.string().min(1, "Employment type is required"),
  employmentStatus: z.string().min(1, "Status is required"),
  basicSalary: z.coerce.number().positive("Must be greater than 0"),
  grossSalary: z.coerce.number().positive("Must be greater than 0"),
});
export type EmployeeImportRowInput = z.infer<typeof employeeImportRowSchema>;
