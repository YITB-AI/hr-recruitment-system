import { NextResponse, after } from "next/server";
import { connectDB } from "@/server/db/connect";
import { employeeRepository, type EmployeeDetailRow } from "@/server/repositories/employee.repository";
import { departmentRepository } from "@/server/repositories/department.repository";
import { employeeLookupRepository } from "@/server/repositories/employee-lookup.repository";
import { employeeDocumentRepository } from "@/server/repositories/employee-document.repository";
import { statusRepository } from "@/server/repositories/status.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { GENDER_LABELS, EMPLOYMENT_TYPE_LABELS, type EmploymentStatus, type EmploymentType, type Gender } from "@/constants/employee";
import { EMPLOYEE_COLUMNS, type EmployeeColumnDef } from "@/constants/employee-columns";

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatDate(value: Date | string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

type ExportExtras = {
  departmentCodeById: Map<string, string | null>;
  costCenterCodeById: Map<string, string | null>;
  employeeCodeById: Record<string, string>;
  statusNameByKey: Map<string, string>;
  documentsCountById: Record<string, number>;
};

// One shared cell-resolution switch, keyed by the same `header` values
// constants/employee-columns.ts already exposes — the same array driving
// this export's header row also drives the import template's, closing the
// original gap (12 vs 8 columns, neither in sync).
function cellFor(col: EmployeeColumnDef, row: EmployeeDetailRow, extras: ExportExtras): string {
  switch (col.header) {
    case "Code":
      return row.employeeCode;
    case "Name":
      return row.name;
    case "Designation":
      return row.designation;
    case "Department":
      return row.department;
    case "Department Code":
      return extras.departmentCodeById.get(row.departmentId ?? "") ?? "";
    case "Employee Type":
      return row.employeeType?.name ?? "";
    case "City":
      return row.city ?? "";
    case "Status":
      return extras.statusNameByKey.get(row.employmentStatus) ?? row.employmentStatus;
    case "Active / Inactive":
      return row.isActive ? "Active" : "Inactive";
    case "Joining Date":
      return formatDate(row.joiningDate);
    case "Employment Type":
      return EMPLOYMENT_TYPE_LABELS[row.employmentType as EmploymentType] ?? row.employmentType;
    case "Station":
      return row.station?.name ?? "";
    case "Report To (Manager Employee Code)":
      return (row.manager && extras.employeeCodeById[row.manager._id]) ?? "";
    case "Leaving Date":
      return formatDate(row.leavingDate);
    case "Mobile Number":
      return row.phone ?? "";
    case "Group":
      return row.group?.name ?? "";
    case "Region":
      return row.region?.name ?? "";
    case "Cost Center":
      return row.costCenter?.name ?? "";
    case "Cost Center Code":
      return extras.costCenterCodeById.get(row.costCenter?._id ?? "") ?? "";
    case "Payroll Setup":
      return row.payrollSetup?.name ?? "";
    case "Date of Birth":
      return formatDate(row.dateOfBirth);
    case "Country":
      return row.country ?? "";
    case "Province":
      return row.province ?? "";
    case "Area":
      return row.area?.name ?? "";
    case "Sub Department":
      return row.subDepartment?.name ?? "";
    case "Vendor":
      return row.vendor?.name ?? "";
    case "Email / Username":
      return row.email;
    case "Expected Probation End Date":
      return formatDate(row.expectedProbationEndDate);
    case "Confirmation Date":
      return formatDate(row.confirmationDate);
    case "Gender":
      return row.gender ? GENDER_LABELS[row.gender as Gender] : "";
    case "Punch Code":
      return row.punchCode ?? "";
    case "CNIC No. / Emirates ID":
      return row.nationalIdNumber ?? "";
    case "CNIC / Emirates ID Expiry Date":
      return formatDate(row.nationalIdExpiryDate);
    case "Passport Expiry Date":
      return formatDate(row.passportExpiryDate);
    case "Family Code":
      return row.familyCode ?? "";
    case "EOBI Entry Date":
      return formatDate(row.eobiEntryDate);
    case "EOBI Registration Number":
      return row.eobiRegistrationNumber ?? "";
    case "Social Security Number":
      return row.socialSecurityNumber ?? "";
    case "Age":
      return row.age != null ? String(row.age) : "";
    case "Years of Service":
      return String(row.yearsOfService);
    case "Role Template":
      return row.roleTemplate?.name ?? "";
    case "Documents":
      return String(extras.documentsCountById[row._id] ?? 0);
    case "Monthly Salary":
      return String(row.basicSalary);
    case "Gross Salary":
      return String(row.grossSalary);
    case "Resignation Date":
      return formatDate(row.resignationDate);
    case "Leaving Reason":
      return row.leavingReason ?? "";
    case "Contract Start Date":
      return formatDate(row.contractStartDate);
    case "Contract End Date":
      return formatDate(row.contractEndDate);
    case "Creation Date":
      return formatDate(row.createdAt);
    case "Inactive Date":
      return formatDate(row.inactiveDate);
    case "Food Allowance":
      return row.foodAllowance != null ? String(row.foodAllowance) : "";
    case "Transport Allowance":
      return row.transportAllowance != null ? String(row.transportAllowance) : "";
    case "Stipend":
      return row.stipend != null ? String(row.stipend) : "";
    case "Alcanza Allowance":
      return row.alcanzaAllowance != null ? String(row.alcanzaAllowance) : "";
    case "Technical Notes":
      return row.technicalNotes ?? "";
    default:
      return "";
  }
}

/**
 * Exports the currently filtered employee list as CSV — respects the same
 * status/department/group/region/station/search query params as the
 * Employees page. Unlike the on-screen list (a deliberately focused column
 * set, matching this app's existing list-view convention), the export
 * covers every column from the Employee Module Enhancement request,
 * including decrypted sensitive fields (salary, CNIC/Emirates ID, EOBI/SSN)
 * — gated behind the same "employee.update" permission as editing an
 * employee record, not left open to every authenticated role the way the
 * on-screen list is.
 */
export async function GET(request: Request) {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.update");

  const { searchParams } = new URL(request.url);
  const filters = {
    status: (searchParams.get("status") as EmploymentStatus) || undefined,
    department: searchParams.get("department") || undefined,
    groupId: searchParams.get("groupId") || undefined,
    regionId: searchParams.get("regionId") || undefined,
    stationId: searchParams.get("stationId") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const rows = await employeeRepository.findAllForExport(actor.companyId, filters);

  const [departments, costCenters, statuses, employeeCodeById, documentsCountById] = await Promise.all([
    departmentRepository.findAll(actor.companyId, true),
    employeeLookupRepository.findAll("cost_center", actor.companyId, true),
    statusRepository.findAllForModule(actor.companyId, "employee", true),
    employeeRepository.findEmployeeCodeMap(actor.companyId),
    employeeDocumentRepository.countByEmployeeIds(actor.companyId, rows.map((r) => r._id)),
  ]);

  const extras: ExportExtras = {
    departmentCodeById: new Map(departments.map((d) => [d._id, d.code])),
    costCenterCodeById: new Map(costCenters.map((c) => [c._id, c.code])),
    employeeCodeById,
    statusNameByKey: new Map(statuses.map((s) => [s.key, s.name])),
    documentsCountById,
  };

  // A bulk export has no single natural entity to point at — entityId is
  // omitted (see models/ActivityLog.ts's comment). Deferred via after()
  // since nothing in the response depends on this write having landed.
  after(() =>
    activityLogRepository
      .create({
        companyId: actor.companyId,
        actorId: resolveActorId(actor),
        actorName: actor.name,
        action: "employee.exported",
        entityType: "employee",
        message: `${actor.name} exported ${rows.length} employee record(s) to CSV`,
      })
      .catch((error) => console.error("Failed to log employee export:", error)),
  );

  const lines = [
    EMPLOYEE_COLUMNS.map((col) => col.header).join(","),
    ...rows.map((row) => EMPLOYEE_COLUMNS.map((col) => escapeCsvCell(cellFor(col, row, extras))).join(",")),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
