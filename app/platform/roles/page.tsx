import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { RoleManagementPanel } from "@/features/platform/components/role-management-panel";
import { listRoles, listPermissionActions } from "@/features/platform/services/role-management.service";

export const metadata: Metadata = { title: "Global Roles & RBAC" };
export const dynamic = "force-dynamic";

export default async function PlatformRolesPage() {
  const [roles, permissionActions] = await Promise.all([listRoles(), Promise.resolve(listPermissionActions())]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Global Roles & RBAC"
        description="Define roles and their permissions once here — every company picks from this same list when assigning a role to a user. No code deployment needed to add or change one."
      />
      <RoleManagementPanel roles={roles} permissionActions={permissionActions} />
    </div>
  );
}
