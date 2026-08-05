import { connectDB } from "@/server/db/connect";
import { userRepository } from "@/server/repositories/user.repository";
import { roleRepository } from "@/server/repositories/role.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { PERMISSION_ACTIONS, type PermissionAction } from "@/lib/auth/permissions";

export type RoleSummary = {
  role: string;
  label: string;
  description: string;
  userCount: number;
  permissions: PermissionAction[];
  isWildcard: boolean;
  isSystemRole: boolean;
};

// Dynamic RBAC: sourced from the live Role collection (server/repositories/
// role.repository.ts), not a hardcoded 4-role list — this page shows
// EVERY role the Global Super Admin has defined (built-in + custom),
// each with how many of THIS company's users currently hold it. Creating/
// editing/deleting a role itself happens from the Platform workspace
// (/platform/roles), not here — this is a read-only view for a company's
// own admin, matching this file's original read-only framing.
export async function listRoleSummaries(): Promise<RoleSummary[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");

  const roles = await roleRepository.findAll();
  const counts = await Promise.all(roles.map((r) => userRepository.countByRole(actor.companyId, r.key)));

  return roles.map((role, index) => ({
    role: role.key,
    label: role.name,
    description: role.description,
    userCount: counts[index],
    permissions: role.isWildcard ? [...PERMISSION_ACTIONS] : role.permissions,
    isWildcard: role.isWildcard,
    isSystemRole: role.isSystem,
  }));
}

export function getAllPermissionActions(): readonly PermissionAction[] {
  return PERMISSION_ACTIONS;
}
