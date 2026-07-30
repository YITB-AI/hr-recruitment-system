import type { EmployeeLookupKind } from "./employee-lookup";

// The single shared source of truth for every Employee column beyond the
// pre-enhancement core (name/email/department/designation/joining date/
// employment type/status/salary, which the import template and export
// already had). Both app/api/employees/import-template/route.ts (the
// template's header row) and app/api/employees/export/route.ts (the
// export's header row) build their CSV headers from this one array —
// closing the exact drift this was built to fix (import had 12 columns,
// export had only 8, and neither matched the other).
//
// `importKey` is the key the parsed CSV/XLSX row is normalized into
// (features/employees/services/employee-import.service.ts's
// parseFileToRecords) — `null` for columns that only make sense as
// read-only/computed output (employeeCode, Department/Cost Center code,
// Active/Inactive, Age, Years of Service, Documents, Creation Date) and
// are therefore never accepted on import.
export type EmployeeColumnKind =
  | "plain"
  | "number"
  | "date"
  | "gender"
  | "department"
  | "subDepartment"
  | "employeeType"
  | "status"
  | "managerCode"
  | "lookup"
  | "computed";

export type EmployeeColumnDef = {
  header: string;
  importKey: string | null;
  kind: EmployeeColumnKind;
  lookupKind?: EmployeeLookupKind;
  exportable: boolean;
};

export const EMPLOYEE_COLUMNS: EmployeeColumnDef[] = [
  { header: "Code", importKey: null, kind: "computed", exportable: true },
  { header: "Name", importKey: "name", kind: "plain", exportable: true },
  { header: "Designation", importKey: "designation", kind: "plain", exportable: true },
  { header: "Department", importKey: "department", kind: "department", exportable: true },
  { header: "Department Code", importKey: null, kind: "computed", exportable: true },
  { header: "Employee Type", importKey: "employeeType", kind: "employeeType", exportable: true },
  { header: "City", importKey: "city", kind: "plain", exportable: true },
  { header: "Status", importKey: "employmentStatus", kind: "status", exportable: true },
  { header: "Active / Inactive", importKey: null, kind: "computed", exportable: true },
  { header: "Joining Date", importKey: "joiningDate", kind: "date", exportable: true },
  { header: "Employment Type", importKey: "employmentType", kind: "plain", exportable: true },
  { header: "Station", importKey: "station", kind: "lookup", lookupKind: "station", exportable: true },
  { header: "Report To (Manager Employee Code)", importKey: "managerEmployeeCode", kind: "managerCode", exportable: true },
  { header: "Leaving Date", importKey: "leavingDate", kind: "date", exportable: true },
  { header: "Mobile Number", importKey: "phone", kind: "plain", exportable: true },
  { header: "Group", importKey: "group", kind: "lookup", lookupKind: "group", exportable: true },
  { header: "Region", importKey: "region", kind: "lookup", lookupKind: "region", exportable: true },
  { header: "Cost Center", importKey: "costCenter", kind: "lookup", lookupKind: "cost_center", exportable: true },
  { header: "Cost Center Code", importKey: null, kind: "computed", exportable: true },
  { header: "Payroll Setup", importKey: "payrollSetup", kind: "lookup", lookupKind: "payroll_setup", exportable: true },
  { header: "Date of Birth", importKey: "dateOfBirth", kind: "date", exportable: true },
  { header: "Country", importKey: "country", kind: "plain", exportable: true },
  { header: "Province", importKey: "province", kind: "plain", exportable: true },
  { header: "Area", importKey: "area", kind: "lookup", lookupKind: "area", exportable: true },
  { header: "Sub Department", importKey: "subDepartment", kind: "subDepartment", exportable: true },
  { header: "Vendor", importKey: "vendor", kind: "lookup", lookupKind: "vendor", exportable: true },
  { header: "Email / Username", importKey: "email", kind: "plain", exportable: true },
  { header: "Expected Probation End Date", importKey: "expectedProbationEndDate", kind: "date", exportable: true },
  { header: "Confirmation Date", importKey: "confirmationDate", kind: "date", exportable: true },
  { header: "Gender", importKey: "gender", kind: "gender", exportable: true },
  { header: "Punch Code", importKey: "punchCode", kind: "plain", exportable: true },
  { header: "CNIC No. / Emirates ID", importKey: "nationalIdNumber", kind: "plain", exportable: true },
  { header: "CNIC / Emirates ID Expiry Date", importKey: "nationalIdExpiryDate", kind: "date", exportable: true },
  { header: "Passport Expiry Date", importKey: "passportExpiryDate", kind: "date", exportable: true },
  { header: "Family Code", importKey: "familyCode", kind: "plain", exportable: true },
  { header: "EOBI Entry Date", importKey: "eobiEntryDate", kind: "date", exportable: true },
  { header: "EOBI Registration Number", importKey: "eobiRegistrationNumber", kind: "plain", exportable: true },
  { header: "Social Security Number", importKey: "socialSecurityNumber", kind: "plain", exportable: true },
  { header: "Age", importKey: null, kind: "computed", exportable: true },
  { header: "Years of Service", importKey: null, kind: "computed", exportable: true },
  { header: "Role Template", importKey: "roleTemplate", kind: "lookup", lookupKind: "role_template", exportable: true },
  { header: "Documents", importKey: null, kind: "computed", exportable: true },
  { header: "Monthly Salary", importKey: "basicSalary", kind: "number", exportable: true },
  { header: "Gross Salary", importKey: "grossSalary", kind: "number", exportable: true },
  { header: "Resignation Date", importKey: "resignationDate", kind: "date", exportable: true },
  { header: "Leaving Reason", importKey: "leavingReason", kind: "plain", exportable: true },
  { header: "Contract Start Date", importKey: "contractStartDate", kind: "date", exportable: true },
  { header: "Contract End Date", importKey: "contractEndDate", kind: "date", exportable: true },
  { header: "Creation Date", importKey: null, kind: "computed", exportable: true },
  { header: "Inactive Date", importKey: "inactiveDate", kind: "date", exportable: true },
  { header: "Food Allowance", importKey: "foodAllowance", kind: "number", exportable: true },
  { header: "Transport Allowance", importKey: "transportAllowance", kind: "number", exportable: true },
  { header: "Stipend", importKey: "stipend", kind: "number", exportable: true },
  { header: "Alcanza Allowance", importKey: "alcanzaAllowance", kind: "number", exportable: true },
  { header: "Technical Notes", importKey: "technicalNotes", kind: "plain", exportable: true },
];
