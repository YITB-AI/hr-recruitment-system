"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Lock, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createRoleAction, updateRoleAction, deleteRoleAction } from "@/actions/roles";
import type { RoleWithUsage } from "@/features/platform/services/role-management.service";
import type { PermissionAction } from "@/lib/auth/permissions";

type EditingState = { mode: "create" } | { mode: "edit"; role: RoleWithUsage } | null;

const EMPTY_FORM = { key: "", name: "", description: "", isWildcard: false, permissions: new Set<PermissionAction>() };

export function RoleManagementPanel({
  roles,
  permissionActions,
}: {
  roles: RoleWithUsage[];
  permissionActions: readonly PermissionAction[];
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.key.includes(search.toLowerCase())),
    [roles, search],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditing({ mode: "create" });
  }

  function openEdit(role: RoleWithUsage) {
    setForm({ key: role.key, name: role.name, description: role.description, isWildcard: role.isWildcard, permissions: new Set(role.permissions) });
    setEditing({ mode: "edit", role });
  }

  function togglePermission(action: PermissionAction) {
    setForm((f) => {
      const next = new Set(f.permissions);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return { ...f, permissions: next };
    });
  }

  function handleSave() {
    startTransition(async () => {
      const payload = { name: form.name, description: form.description, permissions: Array.from(form.permissions), isWildcard: form.isWildcard };
      const result =
        editing?.mode === "edit"
          ? await updateRoleAction({ key: editing.role.key, ...payload })
          : await createRoleAction({ key: form.key, ...payload });

      if (result.success) {
        toast.success(editing?.mode === "edit" ? "Role updated" : "Role created");
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(role: RoleWithUsage) {
    if (!confirm(`Delete the "${role.name}" role? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteRoleAction(role.key);
      if (result.success) toast.success("Role deleted");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-48 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles..." className="pl-9" />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Role
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No roles found" description="Try a different search, or add a new role." />
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((role) => (
            <div key={role.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{role.name}</p>
                  {role.isSystem && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Lock className="size-3" /> Built-in
                    </Badge>
                  )}
                  {role.isWildcard && <Badge variant="outline" className="text-[10px]">All permissions</Badge>}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" /> {role.userCount} user{role.userCount === 1 ? "" : "s"}
                  </span>
                </div>
                {role.description && <p className="truncate text-xs text-muted-foreground">{role.description}</p>}
                {!role.isWildcard && (
                  <p className="truncate text-xs text-muted-foreground">
                    {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"} granted
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(role)} disabled={isPending}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(role)}
                  disabled={isPending || role.isSystem}
                  title={role.isSystem ? "Built-in roles can't be deleted" : undefined}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.mode === "edit" ? `Edit "${editing.role.name}"` : "Add role"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">Name</Label>
                <Input id="role-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Regional HR Lead" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-key">Key {editing?.mode === "edit" && <span className="text-muted-foreground">(can&apos;t be changed)</span>}</Label>
                <Input
                  id="role-key"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))}
                  placeholder="e.g. regional_hr_lead"
                  disabled={editing?.mode === "edit"}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-description">Description</Label>
              <Textarea id="role-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>

            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">All permissions (wildcard)</p>
                <p className="text-xs text-muted-foreground">Grants every action, including ones added in future updates — same as today&apos;s Admin role.</p>
              </div>
              <Checkbox checked={form.isWildcard} onCheckedChange={(v) => setForm((f) => ({ ...f, isWildcard: !!v }))} />
            </label>

            {!form.isWildcard && (
              <div className="space-y-1.5">
                <Label>Permissions</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permissionActions.map((action) => (
                    <label key={action} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                      <Checkbox checked={form.permissions.has(action)} onCheckedChange={() => togglePermission(action)} />
                      <span className="font-mono text-xs">{action}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSave} disabled={isPending || !form.name.trim() || (editing?.mode === "create" && !form.key.trim())}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
