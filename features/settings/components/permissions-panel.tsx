"use client";

import { useState } from "react";
import { Check, X, Users, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoleSummary } from "@/features/settings/services/permissions.service";
import type { PermissionAction } from "@/lib/auth/permissions";
import { PERMISSION_MODULE_LABELS, PERMISSION_ACTION_LABELS, permissionModule } from "@/constants/permission-labels";

function groupByModule(actions: readonly PermissionAction[]): Array<{ module: string; actions: PermissionAction[] }> {
  const groups = new Map<string, PermissionAction[]>();
  for (const action of actions) {
    const mod = permissionModule(action);
    groups.set(mod, [...(groups.get(mod) ?? []), action]);
  }
  return Array.from(groups.entries()).map(([module, moduleActions]) => ({ module, actions: moduleActions }));
}

export function PermissionsPanel({
  roles,
  allActions,
}: {
  roles: RoleSummary[];
  allActions: readonly PermissionAction[];
}) {
  const [selectedRole, setSelectedRole] = useState(roles[0]?.role);
  const selected = roles.find((r) => r.role === selectedRole) ?? roles[0];
  const grouped = groupByModule(allActions);
  const grantedSet = new Set(selected?.permissions ?? []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_260px]">
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium text-muted-foreground">Roles</p>
          <Button variant="outline" size="sm" disabled title="Custom roles aren't supported yet">
            + Add Role
          </Button>
        </div>
        {roles.map((role) => (
          <button
            key={role.role}
            onClick={() => setSelectedRole(role.role)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              selected?.role === role.role ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <p className="text-sm font-medium">{role.label}</p>
            <p className="text-xs text-muted-foreground">
              {role.userCount} user{role.userCount === 1 ? "" : "s"}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className="rounded-xl border">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{selected.label}</h3>
                  <Badge variant="outline">System Role</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              </div>
            </div>
            <div className="divide-y">
              {grouped.map((group) => (
                <div key={group.module} className="p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {PERMISSION_MODULE_LABELS[group.module] ?? group.module}
                  </p>
                  <ul className="space-y-2">
                    {group.actions.map((action) => {
                      const granted = grantedSet.has(action);
                      return (
                        <li key={action} className="flex items-center gap-2.5 text-sm">
                          {granted ? (
                            <Check className="size-4 shrink-0 text-[var(--success)]" />
                          ) : (
                            <X className="size-4 shrink-0 text-muted-foreground/50" />
                          )}
                          <span className={granted ? "" : "text-muted-foreground"}>
                            {PERMISSION_ACTION_LABELS[action] ?? action}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border p-4">
              <p className="mb-3 text-sm font-semibold">Role Details</p>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Role Name</dt>
                  <dd className="font-medium">{selected.label}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Role Key</dt>
                  <dd>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{selected.role}</code>
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />
                    Total Users
                  </dt>
                  <dd className="font-medium">{selected.userCount}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    Status
                  </dt>
                  <dd>
                    <Badge variant="outline">Active</Badge>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border p-4">
              <p className="mb-3 text-sm font-semibold">Role Actions</p>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" disabled title="Custom roles aren't supported yet">
                  Duplicate Role
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive"
                  disabled
                  title="System roles can't be deleted"
                >
                  Delete Role
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
