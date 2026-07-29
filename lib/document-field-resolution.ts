import { getEmployeeMilestones, formatMilestoneDate } from "@/lib/employee-milestones";
import { formatDateWithPreset } from "@/lib/date-format";

// The Employee-shaped field keys and milestone-date resolution that used to
// be implemented twice, identically, in
// features/documents/services/generate-document.service.ts's
// resolveKnownFieldValue (server, authoritative) and
// features/documents/components/generate-document-wizard.tsx's
// autoFillFromEmployee (client preview mirror). Moved here verbatim so
// there's exactly one place this logic lives — both callers now delegate to
// this for the keys it covers and keep their own separate handling for
// whatever it doesn't (Applicant/Company/System fields server-side; nothing
// extra client-side).
export type EmployeeFieldSource = {
  name: string;
  email: string;
  department?: string | null;
  designation?: string | null;
  basicSalary?: number | null;
  grossSalary?: number | null;
  joiningDate?: Date | null;
  employmentType?: string | null;
};

export function resolveEmployeeFieldValue(key: string, employee: EmployeeFieldSource, dateFormat?: string): string | undefined {
  switch (key.toLowerCase()) {
    case "employee_name":
    case "name":
      return employee.name;
    case "designation":
    case "job_title":
    case "position":
      return employee.designation ?? undefined;
    case "department":
    case "dept":
    case "department_name":
      return employee.department ?? undefined;
    case "email":
    case "employee_email":
      return employee.email;
    case "basic_salary":
      return employee.basicSalary != null ? String(employee.basicSalary) : undefined;
    case "gross_salary":
      return employee.grossSalary != null ? String(employee.grossSalary) : undefined;
    case "joining_date":
      return employee.joiningDate ? formatDateWithPreset(employee.joiningDate, dateFormat) : undefined;
    case "probation_end_date":
    case "confirmation_date":
    case "increment_eligibility_date":
    case "contract_renewal_date": {
      if (!employee.joiningDate) return undefined;
      const milestones = getEmployeeMilestones(employee.joiningDate, employee.employmentType ?? "");
      switch (key.toLowerCase()) {
        case "probation_end_date":
          return formatMilestoneDate(milestones.probationEndDate, dateFormat);
        case "confirmation_date":
          return formatMilestoneDate(milestones.confirmationDate, dateFormat);
        case "increment_eligibility_date":
          return formatMilestoneDate(milestones.incrementEligibilityDate, dateFormat);
        case "contract_renewal_date":
          return milestones.contractRenewalDate ? formatMilestoneDate(milestones.contractRenewalDate, dateFormat) : undefined;
        default:
          return undefined;
      }
    }
    default:
      return undefined;
  }
}
