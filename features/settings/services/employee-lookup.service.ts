import { connectDB } from "@/server/db/connect";
import {
  employeeLookupRepository,
  type EmployeeLookupRow,
  type CreateEmployeeLookupInput as RepoCreateInput,
} from "@/server/repositories/employee-lookup.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { Employee } from "@/models/Employee";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { EMPLOYEE_LOOKUP_FIELD, EMPLOYEE_LOOKUP_LABELS, type EmployeeLookupKind } from "@/constants/employee-lookup";
import type { CreateEmployeeLookupInput, UpdateEmployeeLookupInput } from "@/validators/employee-lookup";

// The validator schemas include `kind` (the action layer needs it to parse
// one shared shape for all 8 lists), but the service functions below
// already take `kind` as their own first parameter — Omit it from the
// input object type so callers don't pass it twice.
type CreateInput = Omit<CreateEmployeeLookupInput, "kind">;
type UpdateInput = Omit<UpdateEmployeeLookupInput, "kind">;

async function countUsage(kind: EmployeeLookupKind, companyId: string, id: string): Promise<number> {
  return Employee.countDocuments({ companyId, [EMPLOYEE_LOOKUP_FIELD[kind]]: id });
}

// No permission gate — every role needs these lists to do its job (employee
// form, filters), same reasoning as listActiveDepartments.
export async function listEmployeeLookup(kind: EmployeeLookupKind, includeInactive = true): Promise<EmployeeLookupRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return employeeLookupRepository.findAll(kind, companyId, includeInactive);
}

export async function listActiveEmployeeLookup(kind: EmployeeLookupKind): Promise<EmployeeLookupRow[]> {
  return listEmployeeLookup(kind, false);
}

/** All 8 lists at once — what the Settings management panel renders. */
export async function listAllEmployeeLookups(): Promise<Record<EmployeeLookupKind, EmployeeLookupRow[]>> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return employeeLookupRepository.findAllByKind(companyId, true);
}

export async function createEmployeeLookup(kind: EmployeeLookupKind, input: CreateInput): Promise<EmployeeLookupRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_lookup.manage");

  if (await employeeLookupRepository.existsByName(kind, actor.companyId, input.name)) {
    throw new Error(`A ${EMPLOYEE_LOOKUP_LABELS[kind]} named "${input.name}" already exists`);
  }

  const repoInput: RepoCreateInput = { companyId: actor.companyId, name: input.name, createdBy: resolveActorId(actor) };
  if (input.code !== undefined) repoInput.code = input.code;
  const row = await employeeLookupRepository.create(kind, repoInput);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: `${kind}.created`,
    entityType: "setting",
    entityId: row._id,
    message: `${actor.name} added the "${row.name}" ${EMPLOYEE_LOOKUP_LABELS[kind].toLowerCase()}`,
  });

  return row;
}

export async function updateEmployeeLookup(kind: EmployeeLookupKind, input: UpdateInput): Promise<EmployeeLookupRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_lookup.manage");

  const existing = await employeeLookupRepository.findById(kind, actor.companyId, input.id);
  if (!existing) throw new Error(`${EMPLOYEE_LOOKUP_LABELS[kind]} not found`);

  if (await employeeLookupRepository.existsByName(kind, actor.companyId, input.name, input.id)) {
    throw new Error(`A ${EMPLOYEE_LOOKUP_LABELS[kind]} named "${input.name}" already exists`);
  }

  const row = await employeeLookupRepository.update(kind, actor.companyId, input.id, { name: input.name, code: input.code });
  if (!row) throw new Error(`${EMPLOYEE_LOOKUP_LABELS[kind]} not found`);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: `${kind}.updated`,
    entityType: "setting",
    entityId: row._id,
    message: `${actor.name} renamed a ${EMPLOYEE_LOOKUP_LABELS[kind].toLowerCase()} to "${row.name}"`,
  });

  return row;
}

export async function setEmployeeLookupActive(kind: EmployeeLookupKind, id: string, isActive: boolean): Promise<EmployeeLookupRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_lookup.manage");

  const row = await employeeLookupRepository.update(kind, actor.companyId, id, { isActive });
  if (!row) throw new Error(`${EMPLOYEE_LOOKUP_LABELS[kind]} not found`);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: isActive ? `${kind}.activated` : `${kind}.deactivated`,
    entityType: "setting",
    entityId: row._id,
    message: `${actor.name} ${isActive ? "activated" : "deactivated"} the "${row.name}" ${EMPLOYEE_LOOKUP_LABELS[kind].toLowerCase()}`,
  });

  return row;
}

export async function deleteEmployeeLookup(kind: EmployeeLookupKind, id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_lookup.manage");

  const row = await employeeLookupRepository.findById(kind, actor.companyId, id);
  if (!row) throw new Error(`${EMPLOYEE_LOOKUP_LABELS[kind]} not found`);

  const usageCount = await countUsage(kind, actor.companyId, id);
  if (usageCount > 0) {
    throw new Error(
      `"${row.name}" is used by ${usageCount} employee${usageCount === 1 ? "" : "s"} — deactivate it instead of deleting, so those records keep a resolvable ${EMPLOYEE_LOOKUP_LABELS[kind].toLowerCase()}.`,
    );
  }

  await employeeLookupRepository.softDelete(kind, actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: `${kind}.deleted`,
    entityType: "setting",
    entityId: id,
    message: `${actor.name} deleted the "${row.name}" ${EMPLOYEE_LOOKUP_LABELS[kind].toLowerCase()}`,
  });
}

export async function reorderEmployeeLookup(kind: EmployeeLookupKind, orderedIds: string[]): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "employee_lookup.manage");

  await employeeLookupRepository.reorder(kind, actor.companyId, orderedIds);
}
