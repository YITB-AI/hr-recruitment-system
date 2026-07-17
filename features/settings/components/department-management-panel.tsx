"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createDepartmentAction,
  updateDepartmentAction,
  setDepartmentActiveAction,
  deleteDepartmentAction,
  reorderDepartmentsAction,
} from "@/actions/departments";
import type { DepartmentRow } from "@/server/repositories/department.repository";

type EditingState = { mode: "create" } | { mode: "edit"; department: DepartmentRow } | null;

export function DepartmentManagementPanel({ departments }: { departments: DepartmentRow[] }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())),
    [departments, search],
  );

  function openCreate() {
    setName("");
    setEditing({ mode: "create" });
  }

  function openEdit(department: DepartmentRow) {
    setName(department.name);
    setEditing({ mode: "edit", department });
  }

  function handleSave() {
    startTransition(async () => {
      const result =
        editing?.mode === "edit"
          ? await updateDepartmentAction({ id: editing.department._id, name })
          : await createDepartmentAction({ name });

      if (result.success) {
        toast.success(editing?.mode === "edit" ? "Department updated" : "Department added");
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleActive(department: DepartmentRow) {
    startTransition(async () => {
      const result = await setDepartmentActiveAction(department._id, !department.isActive);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleDelete(department: DepartmentRow) {
    if (!confirm(`Delete "${department.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteDepartmentAction(department._id);
      if (result.success) toast.success("Department deleted");
      else toast.error(result.error);
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= departments.length) return;
    const reordered = [...departments];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      const result = await reorderDepartmentsAction({ orderedIds: reordered.map((d) => d._id) });
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-48 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search departments..." className="pl-9" />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Department
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No departments found" description="Try a different search, or add a new department." />
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((department, index) => (
            <div key={department._id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={isPending || index === 0}
                    onClick={() => handleMove(index, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending || index === filtered.length - 1}
                    onClick={() => handleMove(index, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                </div>
                <p className="text-sm font-medium">{department.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={department.isActive} onCheckedChange={() => handleToggleActive(department)} disabled={isPending} />
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(department)} disabled={isPending}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(department)} disabled={isPending}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.mode === "edit" ? "Edit department" : "Add department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="department-name">Name</Label>
              <Input id="department-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
