// The 8 new employee-record lookup lists (Group/Region/Station/Cost Center/
// Vendor/Role Template/Payroll Setup/Area) are structurally identical —
// {companyId, name, isActive, order, deletedAt, createdBy}, optionally
// `code` — unlike Department/EmployeeType/Status, which have real,
// justified differences (module-scoping, cycle-guards). One registry-driven
// implementation (this file + server/repositories/employee-lookup.repository.ts
// + features/settings/services/employee-lookup.service.ts) backs all 8 real,
// separate Mongoose collections and FK fields on Employee, instead of 8
// near-duplicate bespoke stacks.
export const EMPLOYEE_LOOKUP_KINDS = [
  "group",
  "region",
  "station",
  "cost_center",
  "vendor",
  "role_template",
  "payroll_setup",
  "area",
] as const;
export type EmployeeLookupKind = (typeof EMPLOYEE_LOOKUP_KINDS)[number];

export const EMPLOYEE_LOOKUP_LABELS: Record<EmployeeLookupKind, string> = {
  group: "Group",
  region: "Region",
  station: "Station",
  cost_center: "Cost Center",
  vendor: "Vendor",
  role_template: "Role Template",
  payroll_setup: "Payroll Setup",
  area: "Area",
};

// The Employee schema field (an ObjectId ref) storing this lookup's _id —
// used both for the delete usage-guard and for populating a human name.
export const EMPLOYEE_LOOKUP_FIELD: Record<EmployeeLookupKind, string> = {
  group: "groupId",
  region: "regionId",
  station: "stationId",
  cost_center: "costCenterId",
  vendor: "vendorId",
  role_template: "roleTemplateId",
  payroll_setup: "payrollSetupId",
  area: "areaId",
};

// Only Cost Center pairs a short code alongside its name (matching
// Department's own new "Department Code" field) — every other lookup here
// is name-only.
export const EMPLOYEE_LOOKUP_SUPPORTS_CODE: Record<EmployeeLookupKind, boolean> = {
  group: false,
  region: false,
  station: false,
  cost_center: true,
  vendor: false,
  role_template: false,
  payroll_setup: false,
  area: false,
};
