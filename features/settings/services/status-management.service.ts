import { connectDB } from "@/server/db/connect";
import { statusRepository, type StatusRow } from "@/server/repositories/status.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { Applicant } from "@/models/Applicant";
import { Employee } from "@/models/Employee";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import type { StatusModule } from "@/constants/status-module";
import type { CreateStatusInput, UpdateStatusInput } from "@/validators/status";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `status_${Date.now()}`;
}

async function countUsage(companyId: string, module: StatusModule, key: string): Promise<number> {
  if (module === "applicant") return Applicant.countDocuments({ companyId, status: key });
  if (module === "applicant_source") return Applicant.countDocuments({ companyId, source: key });
  return Employee.countDocuments({ companyId, employmentStatus: key });
}

export async function listStatuses(module: StatusModule, includeInactive = true): Promise<StatusRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return statusRepository.findAllForModule(companyId, module, includeInactive);
}

// Used by non-admin read paths (badges, filters, status-change dropdowns) —
// active statuses only, no admin gate, since every role needs to see the
// current status list to do their job.
export async function listActiveStatuses(module: StatusModule): Promise<StatusRow[]> {
  return listStatuses(module, false);
}

export async function isValidStatusKey(companyId: string, module: StatusModule, key: string): Promise<boolean> {
  const row = await statusRepository.findByKey(companyId, module, key);
  return Boolean(row && row.isActive);
}

export async function createStatus(input: CreateStatusInput): Promise<StatusRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "status.manage");

  const key = slugify(input.name);
  if (await statusRepository.existsByNameOrKey(actor.companyId, input.module, input.name, key)) {
    throw new Error(`A status named "${input.name}" already exists for this module`);
  }

  const status = await statusRepository.create({
    companyId: actor.companyId,
    module: input.module,
    key,
    name: input.name,
    color: input.color,
    icon: input.icon,
    createdBy: actor.id === "system" ? undefined : actor.id,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "status.created",
    entityType: "setting",
    entityId: status._id,
    message: `${actor.name} added the "${status.name}" ${input.module} status`,
  });

  return status;
}

export async function updateStatus(input: UpdateStatusInput): Promise<StatusRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "status.manage");

  const existing = await statusRepository.findById(actor.companyId, input.id);
  if (!existing) throw new Error("Status not found");

  if (await statusRepository.existsByNameOrKey(actor.companyId, existing.module, input.name, existing.key, input.id)) {
    throw new Error(`A status named "${input.name}" already exists for this module`);
  }

  const status = await statusRepository.update(actor.companyId, input.id, {
    name: input.name,
    color: input.color,
    icon: input.icon,
  });
  if (!status) throw new Error("Status not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "status.updated",
    entityType: "setting",
    entityId: status._id,
    message: `${actor.name} updated the "${status.name}" status`,
  });

  return status;
}

export async function setStatusActive(id: string, module: StatusModule, isActive: boolean): Promise<StatusRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "status.manage");

  const status = await statusRepository.update(actor.companyId, id, { isActive });
  if (!status) throw new Error("Status not found");

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: isActive ? "status.activated" : "status.deactivated",
    entityType: "setting",
    entityId: status._id,
    message: `${actor.name} ${isActive ? "activated" : "deactivated"} the "${status.name}" status`,
  });

  return status;
}

export async function deleteStatus(id: string, module: StatusModule): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "status.manage");

  const status = await statusRepository.findById(actor.companyId, id);
  if (!status || status.module !== module) throw new Error("Status not found");

  const usageCount = await countUsage(actor.companyId, module, status.key);
  if (usageCount > 0) {
    throw new Error(
      `"${status.name}" is used by ${usageCount} record${usageCount === 1 ? "" : "s"} — deactivate it instead of deleting, so those records keep a resolvable status.`,
    );
  }

  await statusRepository.softDelete(actor.companyId, id);

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "status.deleted",
    entityType: "setting",
    entityId: id,
    message: `${actor.name} deleted the "${status.name}" status`,
  });
}

export async function reorderStatuses(module: StatusModule, orderedIds: string[]): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "status.manage");

  await statusRepository.reorder(actor.companyId, module, orderedIds);
}
