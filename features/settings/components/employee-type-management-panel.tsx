"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createEmployeeTypeAction,
  updateEmployeeTypeAction,
  setEmployeeTypeActiveAction,
  deleteEmployeeTypeAction,
  reorderEmployeeTypesAction,
} from "@/actions/employee-types";
import type { EmployeeTypeRow } from "@/server/repositories/employee-type.repository";

type EditingState = { mode: "create" } | { mode: "edit"; employeeType: EmployeeTypeRow } | null;

const NO_PARENT = "__none__";

export function EmployeeTypeManagementPanel({ employeeTypes }: { employeeTypes: EmployeeTypeRow[] }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);
  const [name, setName] = useState("");
  const [parentTypeId, setParentTypeId] = useState<string>(NO_PARENT);
  const [isPending, startTransition] = useTransition();

  const nameById = useMemo(() => new Map(employeeTypes.map((t) => [t._id, t.name])), [employeeTypes]);

  const filtered = useMemo(
    () => employeeTypes.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())),
    [employeeTypes, search],
  );

  function openCreate() {
    setName("");
    setParentTypeId(NO_PARENT);
    setEditing({ mode: "create" });
  }

  function openEdit(employeeType: EmployeeTypeRow) {
    setName(employeeType.name);
    setParentTypeId(employeeType.parentTypeId ?? NO_PARENT);
    setEditing({ mode: "edit", employeeType });
  }

  const parentOptions = [
    { value: NO_PARENT, label: "Top-level (no parent)" },
    ...employeeTypes
      .filter((t) => t._id !== (editing?.mode === "edit" ? editing.employeeType._id : ""))
      .map((t) => ({ value: t._id, label: t.name })),
  ];

  function handleSave() {
    startTransition(async () => {
      const parent = parentTypeId === NO_PARENT ? undefined : parentTypeId;
      const result =
        editing?.mode === "edit"
          ? await updateEmployeeTypeAction({ id: editing.employeeType._id, name, parentTypeId: parent ?? null })
          : await createEmployeeTypeAction({ name, parentTypeId: parent });

      if (result.success) {
        toast.success(editing?.mode === "edit" ? "Employee type updated" : "Employee type added");
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleActive(employeeType: EmployeeTypeRow) {
    startTransition(async () => {
      const result = await setEmployeeTypeActiveAction(employeeType._id, !employeeType.isActive);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleDelete(employeeType: EmployeeTypeRow) {
    if (!confirm(`Delete "${employeeType.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteEmployeeTypeAction(employeeType._id);
      if (result.success) toast.success("Employee type deleted");
      else toast.error(result.error);
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= employeeTypes.length) return;
    const reordered = [...employeeTypes];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      const result = await reorderEmployeeTypesAction({ orderedIds: reordered.map((t) => t._id) });
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-48 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee types..." className="pl-9" />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Employee Type
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No employee types found" description="Try a different search, or add a new employee type." />
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((employeeType, index) => (
            <div key={employeeType._id} className="flex items-center justify-between gap-3 px-4 py-3">
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
                <div>
                  <p className="text-sm font-medium">{employeeType.name}</p>
                  {employeeType.parentTypeId && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CornerDownRight className="size-3" />
                      reports to: {nameById.get(employeeType.parentTypeId) ?? "Unknown"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={employeeType.isActive} onCheckedChange={() => handleToggleActive(employeeType)} disabled={isPending} />
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(employeeType)} disabled={isPending}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(employeeType)} disabled={isPending}>
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
            <DialogTitle>{editing?.mode === "edit" ? "Edit employee type" : "Add employee type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="employee-type-name">Name</Label>
              <Input id="employee-type-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Team Lead" />
            </div>
            <div className="space-y-1.5">
              <Label>Reports to</Label>
              <Select items={parentOptions} value={parentTypeId} onValueChange={(v) => setParentTypeId(v ?? NO_PARENT)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
