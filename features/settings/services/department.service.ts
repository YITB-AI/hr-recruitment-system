import { connectDB } from "@/server/db/connect";
import { departmentRepository, type DepartmentRow } from "@/server/repositories/department.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { Employee } from "@/models/Employee";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { CreateDepartmentInput, UpdateDepartmentInput } from "@/validators/department";

async function countUsage(companyId: string, id: string): Promise<number> {
  return Employee.countDocuments({ companyId, departmentId: id });
}

// No permission gate — every role needs the current department list to do
// its job (employee form, filters), same reasoning as listActiveStatuses.
export async function listDepartments(includeInactive = true): Promise<DepartmentRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return departmentRepository.findAll(companyId, includeInactive);
}

export async function listActiveDepartments(): Promise<DepartmentRow[]> {
  return listDepartments(false);
}

export async function createDepartment(input: CreateDepartmentInput): Promise<DepartmentRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "department.manage");

  if (await departmentRepository.existsByName(actor.companyId, input.name)) {
    throw new Error(`A department named "${input.name}" already exists`);
  }

  const department = await departmentRepository.create({
    companyId: actor.companyId,
    name: input.name,
    createdBy: actor.id === "system" ? undefined : actor.id,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "department.created",
    entityType: "setting",
    entityId: department._id,
    message: `${actor.name} added the "${department.name}" department`,
  });

  return department;
}

export async function updateDepartment(input: UpdateDepartmentInput): Promise<DepartmentRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "department.manage");

  const existing = await departmentRepository.findById(actor.companyId, input.id);
  if (!existing) throw new Error("Department not found");

  if (await departmentRepository.existsByName(actor.companyId, input.name, input.id)) {
    throw new Error(`A department named "${input.name}" already exists`);
  }

  const department = await departmentRepository.update(actor.companyId, input.id, { name: input.name });
  if (!department) throw new Error("Department not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "department.updated",
    entityType: "setting",
    entityId: department._id,
    message: `${actor.name} renamed a department to "${department.name}"`,
  });

  return department;
}

export async function setDepartmentActive(id: string, isActive: boolean): Promise<DepartmentRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "department.manage");

  const department = await departmentRepository.update(actor.companyId, id, { isActive });
  if (!department) throw new Error("Department not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: isActive ? "department.activated" : "department.deactivated",
    entityType: "setting",
    entityId: department._id,
    message: `${actor.name} ${isActive ? "activated" : "deactivated"} the "${department.name}" department`,
  });

  return department;
}

export async function deleteDepartment(id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "department.manage");

  const department = await departmentRepository.findById(actor.companyId, id);
  if (!department) throw new Error("Department not found");

  const usageCount = await countUsage(actor.companyId, id);
  if (usageCount > 0) {
    throw new Error(
      `"${department.name}" is used by ${usageCount} employee${usageCount === 1 ? "" : "s"} — deactivate it instead of deleting, so those records keep a resolvable department.`,
    );
  }

  await departmentRepository.softDelete(actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "department.deleted",
    entityType: "setting",
    entityId: id,
    message: `${actor.name} deleted the "${department.name}" department`,
  });
}

export async function reorderDepartments(orderedIds: string[]): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "department.manage");

  await departmentRepository.reorder(actor.companyId, orderedIds);
}
