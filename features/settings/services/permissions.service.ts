import { connectDB } from "@/server/db/connect";
import { userRepository } from "@/server/repositories/user.repository";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { getPermissionsForRole, PERMISSION_ACTIONS, type PermissionAction } from "@/lib/auth/permissions";
import { USER_ROLES, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS, type UserRole } from "@/constants/user";

export type RoleSummary = {
  role: UserRole;
  label: string;
  description: string;
  userCount: number;
  permissions: PermissionAction[];
  isSystemRole: true;
};

// Read-only — this project's Roles & Permissions screen deliberately shows
// the real fixed 4-role system (see lib/auth/permissions.ts) rather than
// supporting custom roles; see the roadmap memory for why that scope was
// cut. isSystemRole is always true today, kept on the type so a future
// custom-role feature (if ever built) has an obvious place to plug in
// without reshaping this response.
export async function listRoleSummaries(): Promise<RoleSummary[]> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "user.manage");

  const counts = await Promise.all(USER_ROLES.map((role) => userRepository.countByRole(actor.companyId, role)));

  return USER_ROLES.map((role, index) => ({
    role,
    label: USER_ROLE_LABELS[role],
    description: USER_ROLE_DESCRIPTIONS[role],
    userCount: counts[index],
    permissions: getPermissionsForRole(role),
    isSystemRole: true as const,
  }));
}

export function getAllPermissionActions(): readonly PermissionAction[] {
  return PERMISSION_ACTIONS;
}
