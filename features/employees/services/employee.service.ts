import { connectDB } from "@/server/db/connect";
import {
  employeeRepository,
  type EmployeeListFilters,
  type EmployeeDetailRow,
} from "@/server/repositories/employee.repository";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { statusRepository } from "@/server/repositories/status.repository";
import { departmentRepository } from "@/server/repositories/department.repository";
import { employeeTypeRepository } from "@/server/repositories/employee-type.repository";
import { employeeLookupRepository } from "@/server/repositories/employee-lookup.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { computeTrend, getWeekWindows } from "@/lib/trend";
import { notifyHrStaff } from "@/lib/staff-notify";
import { EMPLOYEE_LOOKUP_KINDS, EMPLOYEE_LOOKUP_FIELD, EMPLOYEE_LOOKUP_LABELS } from "@/constants/employee-lookup";
import type { EmployeeFormInput } from "@/validators/employee";
import type { SessionUser } from "@/types/user";

async function assertValidEmploymentStatus(companyId: string, status: string): Promise<void> {
  const row = await statusRepository.findByKey(companyId, "employee", status);
  if (!row || !row.isActive) throw new Error("Invalid or inactive employment status");
}

// departmentId is the source of truth going forward; the legacy free-string
// `department` field is derived from it here and kept in sync on every
// create/update so every existing read path (filters, document variables,
// CSV export) keeps working unchanged — see the comment on models/Employee.ts.
async function resolveDepartmentName(companyId: string, departmentId: string): Promise<string> {
  const department = await departmentRepository.findById(companyId, departmentId);
  if (!department || !department.isActive) throw new Error("Invalid or inactive department");
  return department.name;
}

// Optional — unlike department, no fallback free-string field exists to
// keep in sync, so an unset employeeTypeId is simply left unset.
async function assertValidEmployeeType(companyId: string, employeeTypeId: string): Promise<void> {
  const employeeType = await employeeTypeRepository.findById(companyId, employeeTypeId);
  if (!employeeType || !employeeType.isActive) throw new Error("Invalid or inactive employee type");
}

// Validates every provided FK against this company's own active list —
// same reasoning as resolveDepartmentName/assertValidEmployeeType above,
// applied once across all 9 new FK fields (Phase 1's 8 registry-driven
// lookups + "Sub Department", a second FK into Department) instead of 9
// near-duplicate checks. A spoofed/stale id from another company or a
// deactivated/deleted row is rejected here, not silently stored.
async function assertValidLookupRefs(companyId: string, input: EmployeeFormInput): Promise<void> {
  for (const kind of EMPLOYEE_LOOKUP_KINDS) {
    const field = EMPLOYEE_LOOKUP_FIELD[kind] as keyof EmployeeFormInput;
    const id = input[field] as string | undefined;
    if (!id) continue;
    const row = await employeeLookupRepository.findById(kind, companyId, id);
    if (!row || !row.isActive) throw new Error(`Invalid or inactive ${EMPLOYEE_LOOKUP_LABELS[kind]}`);
  }
  if (input.subDepartmentId) {
    const sub = await departmentRepository.findById(companyId, input.subDepartmentId);
    if (!sub || !sub.isActive) throw new Error("Invalid or inactive sub department");
  }
}

function toDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

function toNumber(value?: string): number | undefined {
  return value ? Number(value) : undefined;
}

// Every new plain/date/encrypted field from the Employee Module Enhancement
// that create/update pass through identically — kept in one place so the
// two call sites below can't drift from each other.
function buildEnhancementFields(input: EmployeeFormInput) {
  return {
    groupId: input.groupId || undefined,
    regionId: input.regionId || undefined,
    stationId: input.stationId || undefined,
    costCenterId: input.costCenterId || undefined,
    vendorId: input.vendorId || undefined,
    roleTemplateId: input.roleTemplateId || undefined,
    payrollSetupId: input.payrollSetupId || undefined,
    areaId: input.areaId || undefined,
    subDepartmentId: input.subDepartmentId || undefined,

    dateOfBirth: toDate(input.dateOfBirth),
    gender: input.gender,
    city: input.city,
    country: input.country,
    province: input.province,
    familyCode: input.familyCode,

    nationalIdNumber: input.nationalIdNumber,
    nationalIdExpiryDate: toDate(input.nationalIdExpiryDate),
    passportExpiryDate: toDate(input.passportExpiryDate),
    eobiEntryDate: toDate(input.eobiEntryDate),
    eobiRegistrationNumber: input.eobiRegistrationNumber,
    socialSecurityNumber: input.socialSecurityNumber,
    punchCode: input.punchCode,

    expectedProbationEndDate: toDate(input.expectedProbationEndDate),
    confirmationDate: toDate(input.confirmationDate),
    contractStartDate: toDate(input.contractStartDate),
    contractEndDate: toDate(input.contractEndDate),
    resignationDate: toDate(input.resignationDate),
    leavingDate: toDate(input.leavingDate),
    leavingReason: input.leavingReason,
    inactiveDate: toDate(input.inactiveDate),

    foodAllowance: toNumber(input.foodAllowance),
    transportAllowance: toNumber(input.transportAllowance),
    stipend: toNumber(input.stipend),
    alcanzaAllowance: toNumber(input.alcanzaAllowance),

    technicalNotes: input.technicalNotes,
  };
}

/** Everything the Employees list page needs: paginated rows + the 4 stat cards + filter option lists. */
export async function getEmployeesPageData(filters: EmployeeListFilters) {
  await connectDB();
  const { companyId } = await getCurrentUser();

  const { previousStart, currentStart, now } = getWeekWindows(new Date());

  const [list, departments, totalCount, activeCount, onLeaveCount, inactiveCount, activeThisWeek, activePrevWeek, inactiveThisWeek, inactivePrevWeek] =
    await Promise.all([
      employeeRepository.findAll(companyId, filters),
      employeeRepository.listDepartments(companyId),
      employeeRepository.countTotal(companyId),
      employeeRepository.countByStatus(companyId, "active"),
      employeeRepository.countByStatus(companyId, "on_leave"),
      employeeRepository.countByStatus(companyId, "terminated"),
      employeeRepository.countByStatusUpdatedBetween(companyId, "active", currentStart, now),
      employeeRepository.countByStatusUpdatedBetween(companyId, "active", previousStart, currentStart),
      employeeRepository.countByStatusUpdatedBetween(companyId, "terminated", currentStart, now),
      employeeRepository.countByStatusUpdatedBetween(companyId, "terminated", previousStart, currentStart),
    ]);

  return {
    ...list,
    departments,
    stats: {
      total: { value: totalCount, trend: computeTrend(totalCount, totalCount) },
      active: { value: activeCount, trend: computeTrend(activeThisWeek, activePrevWeek) },
      onLeave: { value: onLeaveCount, trend: null },
      inactive: { value: inactiveCount, trend: computeTrend(inactiveThisWeek, inactivePrevWeek) },
    },
  };
}

export async function getEmployee(id: string): Promise<EmployeeDetailRow | null> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return employeeRepository.findById(companyId, id);
}

export async function getEmployeeDocuments(employeeId: string) {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return generatedDocumentRepository.findByEmployeeId(companyId, employeeId);
}

export async function listManagerOptions() {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return employeeRepository.findAllForPicker(companyId);
}

// Everything a create needs except the per-record HR notification —
// extracted so bulk import (employee-import.service.ts) can create many
// rows in a loop without firing one notification per row, while still
// getting identical validation/resolution/audit-log behavior to a single
// manual create. createEmployee (below) is this plus one notification;
// its own behavior is unchanged.
export async function createEmployeeCore(actor: SessionUser, input: EmployeeFormInput): Promise<EmployeeDetailRow> {
  requireRole(actor, "employee.create");
  if (await employeeRepository.existsByEmail(actor.companyId, input.email)) {
    throw new Error("An employee with this email already exists");
  }
  await assertValidEmploymentStatus(actor.companyId, input.employmentStatus);
  const departmentName = await resolveDepartmentName(actor.companyId, input.departmentId);
  if (input.employeeTypeId) await assertValidEmployeeType(actor.companyId, input.employeeTypeId);
  await assertValidLookupRefs(actor.companyId, input);

  const employeeCode = await employeeRepository.nextEmployeeCode(actor.companyId);
  const created = await employeeRepository.create(actor.companyId, {
    employeeCode,
    name: input.name,
    email: input.email,
    phone: input.phone,
    department: departmentName,
    departmentId: input.departmentId,
    employeeTypeId: input.employeeTypeId || undefined,
    designation: input.designation,
    managerId: input.managerId || undefined,
    joiningDate: new Date(input.joiningDate),
    employmentType: input.employmentType,
    employmentStatus: input.employmentStatus,
    basicSalary: input.basicSalary,
    grossSalary: input.grossSalary,
    ...buildEnhancementFields(input),
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "employee.created",
    entityType: "employee",
    entityId: created._id,
    message: `${actor.name} added ${created.name} (${created.employeeCode}) to ${created.department}`,
  });

  return created;
}

export async function createEmployee(input: EmployeeFormInput): Promise<EmployeeDetailRow> {
  await connectDB();
  const actor = await getCurrentUser();
  const created = await createEmployeeCore(actor, input);

  await notifyHrStaff(actor.companyId, "New employee added", `${created.name} (${created.employeeCode}) was added to ${created.department}.`, {
    type: "employee",
    priority: "normal",
    entityType: "employee",
    entityId: created._id,
  });

  return created;
}

export async function updateEmployee(id: string, input: EmployeeFormInput): Promise<EmployeeDetailRow | null> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.update");
  if (await employeeRepository.existsByEmail(actor.companyId, input.email, id)) {
    throw new Error("An employee with this email already exists");
  }
  await assertValidEmploymentStatus(actor.companyId, input.employmentStatus);
  const departmentName = await resolveDepartmentName(actor.companyId, input.departmentId);
  if (input.employeeTypeId) await assertValidEmployeeType(actor.companyId, input.employeeTypeId);
  await assertValidLookupRefs(actor.companyId, input);

  const updated = await employeeRepository.update(actor.companyId, id, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    department: departmentName,
    departmentId: input.departmentId,
    employeeTypeId: input.employeeTypeId || undefined,
    designation: input.designation,
    managerId: input.managerId || undefined,
    joiningDate: new Date(input.joiningDate),
    employmentType: input.employmentType,
    employmentStatus: input.employmentStatus,
    basicSalary: input.basicSalary,
    grossSalary: input.grossSalary,
    ...buildEnhancementFields(input),
  });
  if (!updated) return null;

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "employee.updated",
    entityType: "employee",
    entityId: id,
    message: `${actor.name} updated ${updated.name}'s profile`,
  });

  return updated;
}

export async function deleteEmployee(id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.delete");

  const existing = await employeeRepository.findById(actor.companyId, id);
  if (!existing) throw new Error("Employee not found");

  await employeeRepository.delete(actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "employee.deleted",
    entityType: "employee",
    entityId: id,
    message: `${actor.name} removed ${existing.name} (${existing.employeeCode})`,
  });
}
