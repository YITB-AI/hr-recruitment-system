import { describe, it, expect } from "vitest";
import { resolveKnownFieldValue, type RecipientRecord } from "@/features/documents/services/generate-document.service";

// Characterization tests for resolveKnownFieldValue — locks in EXACT current
// behavior before features/documents/services/generate-document.service.ts
// and features/documents/components/generate-document-wizard.tsx's
// autoFillFromEmployee are refactored to share the overlapping Employee-
// field logic via lib/document-field-resolution.ts. Every assertion here
// must still pass, unmodified, after that refactor — that's the proof the
// refactor changed nothing observable.

const contractEmployee: RecipientRecord = {
  name: "Jane Doe",
  email: "jane@example.invalid",
  department: "Engineering",
  designation: "Senior Engineer",
  basicSalary: 5000,
  grossSalary: 6000,
  joiningDate: new Date(2025, 0, 15), // local midnight, avoids UTC/local-timezone drift in date-getter-based formatting
  employmentType: "contract",
  employeeCode: "EMP-001",
  phone: "555-1234",
  manager: { name: "Manager Mike" },
  employmentStatus: "Active",
  employeeType: { name: "Individual Contributor" },
};

const fullTimeEmployee: RecipientRecord = { ...contractEmployee, employmentType: "full-time" };

const applicant: RecipientRecord = {
  name: "Alex Applicant",
  email: "alex@example.invalid",
  currentPosition: "QA Engineer",
  jobId: { title: "Backend Engineer" },
  status: "shortlisted",
  source: "referral",
  appliedAt: new Date(2025, 2, 1), // local midnight, see joiningDate comment above
  location: "Remote",
  experienceYears: 4,
  skills: ["Node.js", "SQL"],
  resumeUrl: "https://example.invalid/resume.pdf",
  linkedinUrl: "https://linkedin.example.invalid/alex",
  githubUrl: "https://github.example.invalid/alex",
  portfolioUrl: "https://portfolio.example.invalid/alex",
};

describe("resolveKnownFieldValue — Employee-shaped keys (the part being extracted)", () => {
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
    ["employee_code", "EMP-001"],
    ["phone", "555-1234"],
    ["manager_name", "Manager Mike"],
    ["employment_type", "Contract"],
    ["employment_status", "Active"],
    ["employee_type_name", "Individual Contributor"],
  ])("%s -> %s", (key, expected) => {
    expect(resolveKnownFieldValue(key, contractEmployee)).toBe(expected);
  });

  it("joining_date formats with the default preset when no dateFormat is given", () => {
    expect(resolveKnownFieldValue("joining_date", contractEmployee)).toBe(resolveKnownFieldValue("joining_date", contractEmployee, undefined));
    expect(typeof resolveKnownFieldValue("joining_date", contractEmployee)).toBe("string");
  });

  it("joining_date respects an explicit dateFormat", () => {
    expect(resolveKnownFieldValue("joining_date", contractEmployee, "YYYY-MM-DD")).toBe("2025-01-15");
  });

  it("milestone dates: contract employee gets a real contract_renewal_date", () => {
    expect(resolveKnownFieldValue("probation_end_date", contractEmployee, "YYYY-MM-DD")).toBe("2025-04-15");
    expect(resolveKnownFieldValue("confirmation_date", contractEmployee, "YYYY-MM-DD")).toBe("2025-04-15");
    expect(resolveKnownFieldValue("increment_eligibility_date", contractEmployee, "YYYY-MM-DD")).toBe("2026-01-15");
    expect(resolveKnownFieldValue("contract_renewal_date", contractEmployee, "YYYY-MM-DD")).toBe("2026-01-15");
  });

  it("milestone dates: non-contract employee has no contract_renewal_date", () => {
    expect(resolveKnownFieldValue("contract_renewal_date", fullTimeEmployee, "YYYY-MM-DD")).toBeUndefined();
    expect(resolveKnownFieldValue("probation_end_date", fullTimeEmployee, "YYYY-MM-DD")).toBe("2025-04-15");
  });

  it("milestone dates are undefined when joiningDate is absent", () => {
    const noJoiningDate: RecipientRecord = { ...contractEmployee, joiningDate: null };
    expect(resolveKnownFieldValue("probation_end_date", noJoiningDate)).toBeUndefined();
    expect(resolveKnownFieldValue("joining_date", noJoiningDate)).toBeUndefined();
  });

  it("an unrecognized key returns undefined", () => {
    expect(resolveKnownFieldValue("not_a_real_key", contractEmployee)).toBeUndefined();
  });
});

describe("resolveKnownFieldValue — Applicant-only keys (untouched by this refactor)", () => {
  it.each([
    ["applicant_name", "Alex Applicant"],
    ["applicant_email", "alex@example.invalid"],
    ["applicant_phone", undefined],
    ["applicant_status", "shortlisted"],
    ["source", "referral"],
    ["location", "Remote"],
    ["experience_years", "4"],
    ["skills", "Node.js, SQL"],
    ["resume_url", "https://example.invalid/resume.pdf"],
    ["linkedin_url", "https://linkedin.example.invalid/alex"],
    ["github_url", "https://github.example.invalid/alex"],
    ["portfolio_url", "https://portfolio.example.invalid/alex"],
    ["designation", "QA Engineer"],
    ["job_title", "QA Engineer"],
  ])("%s -> %s", (key, expected) => {
    expect(resolveKnownFieldValue(key, applicant)).toBe(expected);
  });

  it("applied_date formats with an explicit dateFormat", () => {
    expect(resolveKnownFieldValue("applied_date", applicant, "YYYY-MM-DD")).toBe("2025-03-01");
  });
});
