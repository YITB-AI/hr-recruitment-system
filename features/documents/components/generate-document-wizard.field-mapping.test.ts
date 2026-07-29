import { describe, it, expect } from "vitest";
import { autoFillFromEmployee } from "@/features/documents/components/generate-document-wizard";
import type { EmployeeRow } from "@/server/repositories/employee.repository";

// Characterization tests for autoFillFromEmployee — locks in EXACT current
// behavior before it's refactored to delegate to the new shared
// lib/document-field-resolution.ts (see the sibling server-side test file
// generate-document.field-mapping.test.ts for the same treatment of
// resolveKnownFieldValue). Every assertion here must still pass, unmodified,
// after that refactor.

const contractEmployee: EmployeeRow = {
  _id: "employee-1",
  name: "Jane Doe",
  email: "jane@example.invalid",
  department: "Engineering",
  designation: "Senior Engineer",
  basicSalary: 5000,
  grossSalary: 6000,
  joiningDate: new Date(2025, 0, 15), // local midnight, avoids UTC/local-timezone drift
  employmentType: "contract",
};

const fullTimeEmployee: EmployeeRow = { ...contractEmployee, employmentType: "full-time" };

describe("autoFillFromEmployee", () => {
  it.each([
    ["employee_name", "Jane Doe"],
    ["name", "Jane Doe"],
    ["designation", "Senior Engineer"],
    ["job_title", "Senior Engineer"],
    ["position", "Senior Engineer"],
    ["department", "Engineering"],
    ["dept", "Engineering"],
    ["department_name", "Engineering"],
    ["email", "jane@example.invalid"],
    ["employee_email", "jane@example.invalid"],
    ["basic_salary", "5000"],
    ["gross_salary", "6000"],
  ])("%s -> %s", (key, expected) => {
    expect(autoFillFromEmployee(key, contractEmployee)).toBe(expected);
  });

  it("joining_date is ALWAYS ISO (YYYY-MM-DD), regardless of any configured preset — the documented native <input type=\"date\"> quirk", () => {
    expect(autoFillFromEmployee("joining_date", contractEmployee)).toBe("2025-01-15");
  });

  it("milestone dates are ALWAYS ISO too, and contract employee gets a real contract_renewal_date", () => {
    expect(autoFillFromEmployee("probation_end_date", contractEmployee)).toBe("2025-04-15");
    expect(autoFillFromEmployee("confirmation_date", contractEmployee)).toBe("2025-04-15");
    expect(autoFillFromEmployee("increment_eligibility_date", contractEmployee)).toBe("2026-01-15");
    expect(autoFillFromEmployee("contract_renewal_date", contractEmployee)).toBe("2026-01-15");
  });

  it("non-contract employee has no contract_renewal_date", () => {
    expect(autoFillFromEmployee("contract_renewal_date", fullTimeEmployee)).toBeUndefined();
    expect(autoFillFromEmployee("probation_end_date", fullTimeEmployee)).toBe("2025-04-15");
  });

  it("an unrecognized key, and every server/applicant-only key the client never attempts, return undefined", () => {
    expect(autoFillFromEmployee("not_a_real_key", contractEmployee)).toBeUndefined();
    for (const key of ["employee_code", "phone", "manager_name", "employment_type", "employment_status", "employee_type_name", "applicant_status", "company_name", "current_date"]) {
      expect(autoFillFromEmployee(key, contractEmployee)).toBeUndefined();
    }
  });
});
