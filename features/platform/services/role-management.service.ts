import { connectDB } from "@/server/db/connect";
import { roleRepository, type RoleRow } from "@/server/repositories/role.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { requirePlatformAdmin } from "@/lib/auth/permissions";
import { PERMISSION_ACTIONS, type PermissionAction } from "@/lib/auth/permissions";
import type { CreateRoleInput, UpdateRoleInput } from "@/validators/role";

export type RoleWithUsage = RoleRow & { userCount: number };

// All Role reads/writes are platform-level, not scoped to actor.companyId —
// a Role is a shared, cross-company template (see models/Role.ts's own
// comment). activityLogRepository.create is called with companyId omitted
// for the same reason PlatformErrorLog's writes are unscoped: this action
// doesn't belong to any one tenant.
export async function listRoles(): Promise<RoleWithUsage[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const roles = await roleRepository.findAll();
  const counts = await Promise.all(roles.map((r) => roleRepository.countUsers(r.key)));
  return roles.map((role, i) => ({ ...role, userCount: counts[i] }));
}

export function listPermissionActions(): readonly PermissionAction[] {
  return PERMISSION_ACTIONS;
}

export async function createRole(input: CreateRoleInput): Promise<RoleRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  if (await roleRepository.existsByKey(input.key)) throw new Error(`A role with key "${input.key}" already exists`);

  const role = await roleRepository.create({
    key: input.key,
    name: input.name,
    description: input.description,
    permissions: input.permissions,
    isWildcard: input.isWildcard,
    createdBy: resolveActorId(actor),
  });

  await activityLogRepository.create({
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "role.created",
    entityType: "user",
    message: `${actor.name} created the "${role.name}" role`,
  });

  return role;
}

export async function updateRole(input: UpdateRoleInput): Promise<RoleRow> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const updated = await roleRepository.update(input.key, {
    name: input.name,
    description: input.description,
    permissions: input.permissions,
    isWildcard: input.isWildcard,
  });
  if (!updated) throw new Error("Role not found");

  await activityLogRepository.create({
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "role.updated",
    entityType: "user",
    message: `${actor.name} updated the "${updated.name}" role's permissions`,
  });

  return updated;
}

export async function deleteRole(key: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requirePlatformAdmin(actor);

  const role = await roleRepository.findByKey(key);
  await roleRepository.delete(key); // throws with a clear reason on either guard

  await activityLogRepository.create({
    actorId: resolveActorId(actor),
    actorName: actor.name,
    action: "role.deleted",
    entityType: "user",
    message: `${actor.name} deleted the "${role?.name ?? key}" role`,
  });
}
