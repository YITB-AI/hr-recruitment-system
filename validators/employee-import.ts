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

  // --- Employee Module Enhancement — all optional, matching Phase 2/4's
  // decision that none of these are mandatory for a valid employee record.
  city: z.string().optional(),
  station: z.string().optional(),
  leavingDate: z.string().optional(),
  group: z.string().optional(),
  region: z.string().optional(),
  costCenter: z.string().optional(),
  vendor: z.string().optional(),
  payrollSetup: z.string().optional(),
  dateOfBirth: z.string().optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  area: z.string().optional(),
  subDepartment: z.string().optional(),
  expectedProbationEndDate: z.string().optional(),
  confirmationDate: z.string().optional(),
  gender: z.string().optional(),
  punchCode: z.string().optional(),
  nationalIdNumber: z.string().optional(),
  nationalIdExpiryDate: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  familyCode: z.string().optional(),
  eobiEntryDate: z.string().optional(),
  eobiRegistrationNumber: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  roleTemplate: z.string().optional(),
  resignationDate: z.string().optional(),
  leavingReason: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  inactiveDate: z.string().optional(),
  foodAllowance: z.string().optional(),
  transportAllowance: z.string().optional(),
  stipend: z.string().optional(),
  alcanzaAllowance: z.string().optional(),
  technicalNotes: z.string().optional(),
});
export type EmployeeImportRowInput = z.infer<typeof employeeImportRowSchema>;
