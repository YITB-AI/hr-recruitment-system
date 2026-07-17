import { connectDB } from "@/server/db/connect";
import { employeeTypeRepository, type EmployeeTypeRow } from "@/server/repositories/employee-type.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { Employee } from "@/models/Employee";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { CreateEmployeeTypeInput, UpdateEmployeeTypeInput } from "@/validators/employee-type";

async function countUsage(companyId: string, id: string): Promise<number> {
  return Employee.countDocuments({ companyId, employeeTypeId: id });
}

// No permission gate — read paths (employee form, future org-chart views)
// need the list regardless of role, same reasoning as listActiveStatuses.
export async function listEmployeeTypes(includeInactive = true): Promise<EmployeeTypeRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return employeeTypeRepository.findAll(companyId, includeInactive);
}

export async function listActiveEmployeeTypes(): Promise<EmployeeTypeRow[]> {
  return listEmployeeTypes(false);
}

export async function createEmployeeType(input: CreateEmployeeTypeInput): Promise<EmployeeTypeRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_type.manage");

  if (await employeeTypeRepository.existsByName(actor.companyId, input.name)) {
    throw new Error(`An employee type named "${input.name}" already exists`);
  }
  if (input.parentTypeId) {
    const parent = await employeeTypeRepository.findById(actor.companyId, input.parentTypeId);
    if (!parent) throw new Error("The selected parent type was not found");
  }

  const employeeType = await employeeTypeRepository.create({
    companyId: actor.companyId,
    name: input.name,
    parentTypeId: input.parentTypeId,
    createdBy: actor.id === "system" ? undefined : actor.id,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "employee_type.created",
    entityType: "setting",
    entityId: employeeType._id,
    message: `${actor.name} added the "${employeeType.name}" employee type`,
  });

  return employeeType;
}

export async function updateEmployeeType(input: UpdateEmployeeTypeInput): Promise<EmployeeTypeRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_type.manage");

  const existing = await employeeTypeRepository.findById(actor.companyId, input.id);
  if (!existing) throw new Error("Employee type not found");

  if (await employeeTypeRepository.existsByName(actor.companyId, input.name, input.id)) {
    throw new Error(`An employee type named "${input.name}" already exists`);
  }

  if (input.parentTypeId) {
    if (input.parentTypeId === input.id) {
      throw new Error("An employee type can't report to itself");
    }
    const parent = await employeeTypeRepository.findById(actor.companyId, input.parentTypeId);
    if (!parent) throw new Error("The selected parent type was not found");
    if (await employeeTypeRepository.wouldCreateCycle(actor.companyId, input.id, input.parentTypeId)) {
      throw new Error("That would create a reporting cycle — pick a different parent type");
    }
  }

  const employeeType = await employeeTypeRepository.update(actor.companyId, input.id, {
    name: input.name,
    parentTypeId: input.parentTypeId ?? null,
  });
  if (!employeeType) throw new Error("Employee type not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "employee_type.updated",
    entityType: "setting",
    entityId: employeeType._id,
    message: `${actor.name} updated the "${employeeType.name}" employee type`,
  });

  return employeeType;
}

export async function setEmployeeTypeActive(id: string, isActive: boolean): Promise<EmployeeTypeRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_type.manage");

  const employeeType = await employeeTypeRepository.update(actor.companyId, id, { isActive });
  if (!employeeType) throw new Error("Employee type not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: isActive ? "employee_type.activated" : "employee_type.deactivated",
    entityType: "setting",
    entityId: employeeType._id,
    message: `${actor.name} ${isActive ? "activated" : "deactivated"} the "${employeeType.name}" employee type`,
  });

  return employeeType;
}

export async function deleteEmployeeType(id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_type.manage");

  const employeeType = await employeeTypeRepository.findById(actor.companyId, id);
  if (!employeeType) throw new Error("Employee type not found");

  const usageCount = await countUsage(actor.companyId, id);
  if (usageCount > 0) {
    throw new Error(
      `"${employeeType.name}" is used by ${usageCount} employee${usageCount === 1 ? "" : "s"} — deactivate it instead of deleting.`,
    );
  }

  const childCount = await employeeTypeRepository.findAll(actor.companyId, true).then(
    (all) => all.filter((t) => t.parentTypeId === id).length,
  );
  if (childCount > 0) {
    throw new Error(`"${employeeType.name}" is the parent of ${childCount} other employee type(s) — reassign or delete those first.`);
  }

  await employeeTypeRepository.softDelete(actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "employee_type.deleted",
    entityType: "setting",
    entityId: id,
    message: `${actor.name} deleted the "${employeeType.name}" employee type`,
  });
}

export async function reorderEmployeeTypes(orderedIds: string[]): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_type.manage");

  await employeeTypeRepository.reorder(actor.companyId, orderedIds);
}
