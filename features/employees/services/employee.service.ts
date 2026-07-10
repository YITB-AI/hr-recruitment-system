import { connectDB } from "@/server/db/connect";
import {
  employeeRepository,
  type EmployeeListFilters,
  type EmployeeDetailRow,
} from "@/server/repositories/employee.repository";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser } from "@/lib/current-user";
import { computeTrend, getWeekWindows } from "@/lib/trend";
import type { EmployeeFormInput } from "@/validators/employee";

/** Everything the Employees list page needs: paginated rows + the 4 stat cards + filter option lists. */
export async function getEmployeesPageData(filters: EmployeeListFilters) {
  await connectDB();

  const { previousStart, currentStart, now } = getWeekWindows(new Date());

  const [list, departments, totalCount, activeCount, onLeaveCount, inactiveCount, activeThisWeek, activePrevWeek, inactiveThisWeek, inactivePrevWeek] =
    await Promise.all([
      employeeRepository.findAll(filters),
      employeeRepository.listDepartments(),
      employeeRepository.countTotal(),
      employeeRepository.countByStatus("active"),
      employeeRepository.countByStatus("on_leave"),
      employeeRepository.countByStatus("terminated"),
      employeeRepository.countByStatusUpdatedBetween("active", currentStart, now),
      employeeRepository.countByStatusUpdatedBetween("active", previousStart, currentStart),
      employeeRepository.countByStatusUpdatedBetween("terminated", currentStart, now),
      employeeRepository.countByStatusUpdatedBetween("terminated", previousStart, currentStart),
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
  return employeeRepository.findById(id);
}

export async function getEmployeeDocuments(employeeId: string) {
  await connectDB();
  return generatedDocumentRepository.findByEmployeeId(employeeId);
}

export async function listManagerOptions() {
  await connectDB();
  return employeeRepository.findAllForPicker();
}

export async function createEmployee(input: EmployeeFormInput): Promise<EmployeeDetailRow> {
  await connectDB();

  const employeeCode = await employeeRepository.nextEmployeeCode();
  const created = await employeeRepository.create({
    employeeCode,
    name: input.name,
    email: input.email,
    phone: input.phone,
    department: input.department,
    designation: input.designation,
    managerId: input.managerId || undefined,
    joiningDate: new Date(input.joiningDate),
    employmentType: input.employmentType,
    employmentStatus: input.employmentStatus,
    basicSalary: input.basicSalary,
    grossSalary: input.grossSalary,
  });

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "employee.created",
    entityType: "employee",
    entityId: created._id,
    message: `${actor.name} added ${created.name} (${created.employeeCode}) to ${created.department}`,
  });

  return created;
}

export async function updateEmployee(id: string, input: EmployeeFormInput): Promise<EmployeeDetailRow | null> {
  await connectDB();

  const updated = await employeeRepository.update(id, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    department: input.department,
    designation: input.designation,
    managerId: input.managerId || undefined,
    joiningDate: new Date(input.joiningDate),
    employmentType: input.employmentType,
    employmentStatus: input.employmentStatus,
    basicSalary: input.basicSalary,
    grossSalary: input.grossSalary,
  });
  if (!updated) return null;

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
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

  const existing = await employeeRepository.findById(id);
  if (!existing) throw new Error("Employee not found");

  await employeeRepository.delete(id);

  const actor = await getCurrentUser();
  await activityLogRepository.create({
    actorId: actor.id === "no-users-seeded" ? undefined : actor.id,
    actorName: actor.name,
    action: "employee.deleted",
    entityType: "employee",
    entityId: id,
    message: `${actor.name} removed ${existing.name} (${existing.employeeCode})`,
  });
}
