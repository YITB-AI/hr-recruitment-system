import ExcelJS from "exceljs";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { notifyHrStaff } from "@/lib/staff-notify";
import { parseCsv } from "@/lib/csv";
import { employeeImportRowSchema } from "@/validators/employee-import";
import type { EmployeeFormInput } from "@/validators/employee";
import { employeeRepository } from "@/server/repositories/employee.repository";
import { departmentRepository } from "@/server/repositories/department.repository";
import { employeeTypeRepository } from "@/server/repositories/employee-type.repository";
import { statusRepository } from "@/server/repositories/status.repository";
import { employeeLookupRepository, type EmployeeLookupRow } from "@/server/repositories/employee-lookup.repository";
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS, GENDER_OPTIONS, GENDER_LABELS, type EmploymentType, type Gender } from "@/constants/employee";
import { EMPLOYEE_LOOKUP_KINDS, EMPLOYEE_LOOKUP_LABELS, type EmployeeLookupKind } from "@/constants/employee-lookup";
import { EMPLOYEE_COLUMNS } from "@/constants/employee-columns";
import { createEmployeeCore } from "./employee.service";

const MAX_ROWS = 1000;

// Expected template columns → the raw-row keys the rest of this file works
// with, tolerant of header case/whitespace (see normalizeHeader). Built from
// the single shared constants/employee-columns.ts list — the exact thing
// that had drifted before (import template had 12 columns, export had 8,
// neither matched the other or this file's own resolution logic).
const HEADER_MAP: Record<string, string> = Object.fromEntries(
  EMPLOYEE_COLUMNS.filter((col) => col.importKey).map((col) => [col.header.toLowerCase(), col.importKey as string]),
);

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

async function parseFileToRecords(buffer: Buffer, fileName: string): Promise<Record<string, string>[]> {
  const lowerName = fileName.toLowerCase();
  let rows: string[][];

  if (lowerName.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const worksheet = workbook.worksheets[0];
    rows = [];
    worksheet?.eachRow((row) => {
      const values = row.values as unknown[];
      // ExcelJS's row.values is 1-indexed — index 0 is always undefined.
      rows.push(values.slice(1).map((v) => (v == null ? "" : String(v).trim())));
    });
  } else if (lowerName.endsWith(".csv")) {
    rows = parseCsv(buffer.toString("utf-8"));
  } else {
    throw new Error("Only .csv or .xlsx files are supported");
  }

  if (rows.length === 0) return [];

  const headerRow = rows[0].map(normalizeHeader);
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim() !== ""));

  return dataRows.map((row) => {
    const record: Record<string, string> = {};
    headerRow.forEach((header, i) => {
      const key = HEADER_MAP[header];
      if (key) record[key] = (row[i] ?? "").trim();
    });
    return record;
  });
}

export type ImportRowResult =
  | { row: number; name: string; email: string; success: true; resolved: EmployeeFormInput }
  | { row: number; name: string; email: string; success: false; errors: string[] };

// Pure preview — validates and resolves every row against this company's
// real master data (department/employee-type/status names, an existing
// manager's employee code) but never writes anything. The caller renders
// this as a per-row summary, then only the success:true rows are ever
// passed to commitEmployeeImport below.
export async function validateEmployeeImport(fileBuffer: Buffer, fileName: string): Promise<{ rows: ImportRowResult[] }> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.create");

  const records = await parseFileToRecords(fileBuffer, fileName);
  if (records.length === 0) throw new Error("No data rows found in this file — check it has a header row and at least one employee.");
  if (records.length > MAX_ROWS) throw new Error(`This file has ${records.length} rows — the limit is ${MAX_ROWS} per import.`);

  const [departments, employeeTypes, statuses, lookupsByKind] = await Promise.all([
    departmentRepository.findAll(actor.companyId, false),
    employeeTypeRepository.findAll(actor.companyId, false),
    statusRepository.findAllForModule(actor.companyId, "employee", false),
    employeeLookupRepository.findAllByKind(actor.companyId, false),
  ]);
  const departmentByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));
  const employeeTypeByName = new Map(employeeTypes.map((t) => [t.name.toLowerCase(), t]));
  const statusByName = new Map(statuses.map((s) => [s.name.toLowerCase(), s]));
  const employmentTypeByValue = new Map<string, EmploymentType>(
    EMPLOYMENT_TYPES.flatMap((t) => [
      [t, t],
      [EMPLOYMENT_TYPE_LABELS[t].toLowerCase(), t],
    ] as [string, EmploymentType][]),
  );
  // One name→row map per lookup kind (Group/Region/Station/Cost Center/
  // Vendor/Role Template/Payroll Setup/Area) — same by-name resolution
  // pattern as department/employeeType/status above, generalized across
  // all 8 registry-driven lookups instead of 8 near-duplicate blocks.
  const lookupNameMaps = Object.fromEntries(
    EMPLOYEE_LOOKUP_KINDS.map((kind) => [kind, new Map(lookupsByKind[kind].map((row) => [row.name.toLowerCase(), row]))]),
  ) as Record<EmployeeLookupKind, Map<string, EmployeeLookupRow>>;

  function resolveLookup(kind: EmployeeLookupKind, errors: string[], raw?: string): string | undefined {
    if (!raw) return undefined;
    const row = lookupNameMaps[kind].get(raw.toLowerCase());
    if (!row) {
      errors.push(
        `Unknown ${EMPLOYEE_LOOKUP_LABELS[kind]} "${raw}" — valid options: ${lookupsByKind[kind].map((r) => r.name).join(", ") || "none configured yet"}`,
      );
      return undefined;
    }
    return row._id;
  }

  function resolveGender(errors: string[], raw?: string): Gender | undefined {
    if (!raw) return undefined;
    const match = GENDER_OPTIONS.find((g) => g === raw.toLowerCase() || GENDER_LABELS[g].toLowerCase() === raw.toLowerCase());
    if (!match) {
      errors.push(`Unknown gender "${raw}" — valid options: ${GENDER_OPTIONS.map((g) => GENDER_LABELS[g]).join(", ")}`);
    }
    return match;
  }

  function validateOptionalDateString(errors: string[], label: string, raw?: string): string | undefined {
    if (!raw) return undefined;
    if (Number.isNaN(new Date(raw).getTime())) {
      errors.push(`Invalid ${label} "${raw}" — use YYYY-MM-DD`);
      return undefined;
    }
    return raw;
  }

  function validateOptionalNumberString(errors: string[], label: string, raw?: string): string | undefined {
    if (!raw) return undefined;
    if (!/^\d+(\.\d+)?$/.test(raw)) {
      errors.push(`Invalid ${label} "${raw}" — must be a number`);
      return undefined;
    }
    return raw;
  }

  const seenEmails = new Set<string>();
  const results: ImportRowResult[] = [];

  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    const rowNumber = i + 2; // 1-based, +1 to account for the header row
    const rawName = raw.name ?? "";
    const rawEmail = raw.email ?? "";
    const errors: string[] = [];

    const parsed = employeeImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      results.push({ row: rowNumber, name: rawName, email: rawEmail, success: false, errors: parsed.error.issues.map((i) => i.message) });
      continue;
    }
    const data = parsed.data;
    const email = data.email.toLowerCase();

    if (seenEmails.has(email)) {
      errors.push("Duplicate email in this file (already used by an earlier row)");
    }

    const joiningDate = new Date(data.joiningDate);
    if (Number.isNaN(joiningDate.getTime())) {
      errors.push(`Invalid joining date "${data.joiningDate}" — use YYYY-MM-DD`);
    }

    const department = departmentByName.get(data.department.toLowerCase());
    if (!department) {
      errors.push(`Unknown department "${data.department}" — valid options: ${departments.map((d) => d.name).join(", ") || "none configured yet"}`);
    }

    let employeeTypeId: string | undefined;
    if (data.employeeType) {
      const employeeType = employeeTypeByName.get(data.employeeType.toLowerCase());
      if (!employeeType) {
        errors.push(`Unknown employee type "${data.employeeType}" — valid options: ${employeeTypes.map((t) => t.name).join(", ") || "none configured yet"}`);
      } else {
        employeeTypeId = employeeType._id;
      }
    }

    const status = statusByName.get(data.employmentStatus.toLowerCase());
    if (!status) {
      errors.push(`Unknown status "${data.employmentStatus}" — valid options: ${statuses.map((s) => s.name).join(", ")}`);
    }

    const employmentType = employmentTypeByValue.get(data.employmentType.toLowerCase());
    if (!employmentType) {
      errors.push(`Unknown employment type "${data.employmentType}" — valid options: ${EMPLOYMENT_TYPES.map((t) => EMPLOYMENT_TYPE_LABELS[t]).join(", ")}`);
    }

    let managerId: string | undefined;
    if (data.managerEmployeeCode) {
      const manager = await employeeRepository.findByCode(actor.companyId, data.managerEmployeeCode);
      if (!manager) {
        errors.push(`Manager employee code "${data.managerEmployeeCode}" was not found — the manager must already exist in the system`);
      } else {
        managerId = manager._id;
      }
    }

    const emailAlreadyExists = await employeeRepository.existsByEmail(email);
    if (emailAlreadyExists) {
      errors.push("An employee with this email already exists");
    }

    seenEmails.add(email);

    // --- Employee Module Enhancement — every remaining new field, resolved
    // the same way department/employeeType/status already are above: FK
    // fields by name against this company's real master data, dates
    // validated as real dates, allowances validated as real numbers,
    // everything else passed through as-is. All optional.
    const groupId = resolveLookup("group", errors, data.group);
    const regionId = resolveLookup("region", errors, data.region);
    const stationId = resolveLookup("station", errors, data.station);
    const costCenterId = resolveLookup("cost_center", errors, data.costCenter);
    const vendorId = resolveLookup("vendor", errors, data.vendor);
    const roleTemplateId = resolveLookup("role_template", errors, data.roleTemplate);
    const payrollSetupId = resolveLookup("payroll_setup", errors, data.payrollSetup);
    const areaId = resolveLookup("area", errors, data.area);

    let subDepartmentId: string | undefined;
    if (data.subDepartment) {
      const sub = departmentByName.get(data.subDepartment.toLowerCase());
      if (!sub) {
        errors.push(`Unknown sub department "${data.subDepartment}" — valid options: ${departments.map((d) => d.name).join(", ") || "none configured yet"}`);
      } else {
        subDepartmentId = sub._id;
      }
    }

    const gender = resolveGender(errors, data.gender);
    const dateOfBirth = validateOptionalDateString(errors, "date of birth", data.dateOfBirth);
    const leavingDate = validateOptionalDateString(errors, "leaving date", data.leavingDate);
    const expectedProbationEndDate = validateOptionalDateString(errors, "expected probation end date", data.expectedProbationEndDate);
    const confirmationDate = validateOptionalDateString(errors, "confirmation date", data.confirmationDate);
    const nationalIdExpiryDate = validateOptionalDateString(errors, "CNIC / Emirates ID expiry date", data.nationalIdExpiryDate);
    const passportExpiryDate = validateOptionalDateString(errors, "passport expiry date", data.passportExpiryDate);
    const eobiEntryDate = validateOptionalDateString(errors, "EOBI entry date", data.eobiEntryDate);
    const resignationDate = validateOptionalDateString(errors, "resignation date", data.resignationDate);
    const contractStartDate = validateOptionalDateString(errors, "contract start date", data.contractStartDate);
    const contractEndDate = validateOptionalDateString(errors, "contract end date", data.contractEndDate);
    const inactiveDate = validateOptionalDateString(errors, "inactive date", data.inactiveDate);
    const foodAllowance = validateOptionalNumberString(errors, "food allowance", data.foodAllowance);
    const transportAllowance = validateOptionalNumberString(errors, "transport allowance", data.transportAllowance);
    const stipend = validateOptionalNumberString(errors, "stipend", data.stipend);
    const alcanzaAllowance = validateOptionalNumberString(errors, "alcanza allowance", data.alcanzaAllowance);

    if (errors.length > 0) {
      results.push({ row: rowNumber, name: data.name, email, success: false, errors });
      continue;
    }

    results.push({
      row: rowNumber,
      name: data.name,
      email,
      success: true,
      resolved: {
        name: data.name,
        email,
        phone: data.phone || undefined,
        departmentId: department!._id,
        employeeTypeId,
        designation: data.designation,
        managerId,
        joiningDate: data.joiningDate,
        employmentType: employmentType!,
        employmentStatus: status!.key,
        basicSalary: data.basicSalary,
        grossSalary: data.grossSalary,

        groupId,
        regionId,
        stationId,
        costCenterId,
        vendorId,
        roleTemplateId,
        payrollSetupId,
        areaId,
        subDepartmentId,

        dateOfBirth,
        gender,
        city: data.city || undefined,
        country: data.country || undefined,
        province: data.province || undefined,
        familyCode: data.familyCode || undefined,

        nationalIdNumber: data.nationalIdNumber || undefined,
        nationalIdExpiryDate,
        passportExpiryDate,
        eobiEntryDate,
        eobiRegistrationNumber: data.eobiRegistrationNumber || undefined,
        socialSecurityNumber: data.socialSecurityNumber || undefined,
        punchCode: data.punchCode || undefined,

        expectedProbationEndDate,
        confirmationDate,
        contractStartDate,
        contractEndDate,
        resignationDate,
        leavingDate,
        leavingReason: data.leavingReason || undefined,
        inactiveDate,

        foodAllowance,
        transportAllowance,
        stipend,
        alcanzaAllowance,

        technicalNotes: data.technicalNotes || undefined,
      },
    });
  }

  return { rows: results };
}

export type ImportCommitResultItem =
  | { row: number; name: string; email: string; success: true; employeeId: string; employeeCode: string }
  | { row: number; name: string; email: string; success: false; error: string };

// Sequential, not Promise.allSettled — employeeRepository.nextEmployeeCode
// counts existing rows and is not concurrency-safe (its own comment admits
// a genuine race fails loudly with a duplicate-key error); running this
// concurrently for a batch would make most rows spuriously fail. Each row
// still gets its own try/catch so one bad row can't sink the batch — same
// outcome as allSettled, just serialized. Fires exactly one aggregate
// notification at the end (via createEmployeeCore, not createEmployee) so a
// large import doesn't fire one notification per row.
export async function commitEmployeeImport(
  rows: Array<{ row: number; input: EmployeeFormInput }>,
): Promise<{ successCount: number; results: ImportCommitResultItem[] }> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.create");

  const results: ImportCommitResultItem[] = [];
  for (const { row, input } of rows) {
    try {
      const created = await createEmployeeCore(actor, input);
      results.push({ row, name: created.name, email: created.email, success: true, employeeId: created._id, employeeCode: created.employeeCode });
    } catch (error) {
      results.push({ row, name: input.name, email: input.email, success: false, error: error instanceof Error ? error.message : "Failed to create employee" });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  if (successCount > 0) {
    await notifyHrStaff(
      actor.companyId,
      "Employees imported",
      `${successCount} employee${successCount === 1 ? "" : "s"} added via bulk import.`,
      { type: "employee", priority: "normal" },
    );
  }

  return { successCount, results };
}
