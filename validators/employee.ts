import { z } from "zod";
import { EMPLOYMENT_TYPES, GENDER_OPTIONS } from "@/constants/employee";

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

  // --- Employee Module Enhancement ---
  // FK fields into Phase 1's 8 registry-driven lookup lists, plus a second,
  // independent FK into Department for "Sub Department" — all optional,
  // validated against this company's own active list at the service layer
  // (see employee.service.ts), same pattern as departmentId/employeeTypeId.
  groupId: z.string().optional(),
  regionId: z.string().optional(),
  stationId: z.string().optional(),
  costCenterId: z.string().optional(),
  vendorId: z.string().optional(),
  roleTemplateId: z.string().optional(),
  payrollSetupId: z.string().optional(),
  areaId: z.string().optional(),
  subDepartmentId: z.string().optional(),

  dateOfBirth: z.string().optional(),
  gender: z.enum(GENDER_OPTIONS).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  province: z.string().optional(),
  familyCode: z.string().optional(),

  // Encrypted at rest (see server/repositories/employee.repository.ts) —
  // the form/validator only ever see plaintext, same as basicSalary/
  // grossSalary above.
  nationalIdNumber: z.string().optional(),
  nationalIdExpiryDate: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  eobiEntryDate: z.string().optional(),
  eobiRegistrationNumber: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  punchCode: z.string().optional(),

  // Left blank to auto-default from joiningDate + 3mo at creation time (see
  // employeeRepository.create) — editable afterward either way.
  expectedProbationEndDate: z.string().optional(),
  confirmationDate: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  resignationDate: z.string().optional(),
  leavingDate: z.string().optional(),
  leavingReason: z.string().optional(),
  inactiveDate: z.string().optional(),

  // Plain optional strings, not z.coerce.number() — a raw HTML number
  // input's value is a string, and coercing here would make an empty field
  // coerce to 0 (Number("") === 0) rather than staying "left blank" (same
  // reasoning as validators/ai-call.ts's salaryBudget). Parsed to a real
  // number in employee.service.ts's buildEnhancementFields instead.
  foodAllowance: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Enter a valid number")
    .optional()
    .or(z.literal("")),
  transportAllowance: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Enter a valid number")
    .optional()
    .or(z.literal("")),
  stipend: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Enter a valid number")
    .optional()
    .or(z.literal("")),
  alcanzaAllowance: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Enter a valid number")
    .optional()
    .or(z.literal("")),

  technicalNotes: z.string().optional(),
});

export type EmployeeFormInput = z.infer<typeof employeeFormSchema>;
