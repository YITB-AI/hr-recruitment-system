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
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { computeTrend, getWeekWindows } from "@/lib/trend";
import { notifyHrStaff } from "@/lib/staff-notify";
import type { EmployeeFormInput } from "@/validators/employee";

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

export async function createEmployee(input: EmployeeFormInput): Promise<EmployeeDetailRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee.create");
  await assertValidEmploymentStatus(actor.companyId, input.employmentStatus);
  const departmentName = await resolveDepartmentName(actor.companyId, input.departmentId);
  if (input.employeeTypeId) await assertValidEmployeeType(actor.companyId, input.employeeTypeId);

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
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "employee.created",
    entityType: "employee",
    entityId: created._id,
    message: `${actor.name} added ${created.name} (${created.employeeCode}) to ${created.department}`,
  });

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
  await assertValidEmploymentStatus(actor.companyId, input.employmentStatus);
  const departmentName = await resolveDepartmentName(actor.companyId, input.departmentId);
  if (input.employeeTypeId) await assertValidEmployeeType(actor.companyId, input.employeeTypeId);

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
  });
  if (!updated) return null;

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
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
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "employee.deleted",
    entityType: "employee",
    entityId: id,
    message: `${actor.name} removed ${existing.name} (${existing.employeeCode})`,
  });
}
