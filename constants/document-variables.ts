// Reference list for the template editor's variable picker
// (features/documents/components/variable-picker.tsx) — every key here is
// actually resolvable today by resolveKnownFieldValue in
// generate-document.service.ts. This is a reference/copy panel only:
// documents are edited in Word, not in-browser, so there's nothing to
// "insert into" here — just {{key}} tags to copy while typing them in Word.
export const KNOWN_TEMPLATE_VARIABLES = [
  { key: "employee_name", label: "Employee / Applicant Name", group: "Recipient" },
  { key: "designation", label: "Designation / Job Title", group: "Recipient" },
  { key: "department", label: "Department", group: "Recipient" },
  { key: "email", label: "Email", group: "Recipient" },
  { key: "basic_salary", label: "Basic Salary", group: "Salary (employees only)" },
  { key: "gross_salary", label: "Gross Salary", group: "Salary (employees only)" },
  { key: "probation_end_date", label: "Probation End Date", group: "Milestone Dates (employees only)" },
  { key: "confirmation_date", label: "Confirmation Date", group: "Milestone Dates (employees only)" },
  { key: "increment_eligibility_date", label: "Increment Eligibility Date", group: "Milestone Dates (employees only)" },
  { key: "contract_renewal_date", label: "Contract Renewal Date", group: "Milestone Dates (contract employees only)" },
] as const;
