"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createEmployeeLookupAction,
  updateEmployeeLookupAction,
  setEmployeeLookupActiveAction,
  deleteEmployeeLookupAction,
  reorderEmployeeLookupAction,
} from "@/actions/employee-lookups";
import { confirmAction } from "@/store/confirm-store";
import {
  EMPLOYEE_LOOKUP_KINDS,
  EMPLOYEE_LOOKUP_LABELS,
  EMPLOYEE_LOOKUP_SUPPORTS_CODE,
  type EmployeeLookupKind,
} from "@/constants/employee-lookup";
import type { EmployeeLookupRow } from "@/server/repositories/employee-lookup.repository";

type EditingState = { mode: "create" } | { mode: "edit"; row: EmployeeLookupRow } | null;

function EmployeeLookupList({ kind, rows }: { kind: EmployeeLookupKind; rows: EmployeeLookupRow[] }) {
  const label = EMPLOYEE_LOOKUP_LABELS[kind];
  const supportsCode = EMPLOYEE_LOOKUP_SUPPORTS_CODE[kind];
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())), [rows, search]);

  function openCreate() {
    setName("");
    setCode("");
    setEditing({ mode: "create" });
  }

  function openEdit(row: EmployeeLookupRow) {
    setName(row.name);
    setCode(row.code ?? "");
    setEditing({ mode: "edit", row });
  }

  function handleSave() {
    startTransition(async () => {
      const result =
        editing?.mode === "edit"
          ? await updateEmployeeLookupAction({ kind, id: editing.row._id, name, code })
          : await createEmployeeLookupAction({ kind, name, code });

      if (result.success) {
        toast.success(editing?.mode === "edit" ? `${label} updated` : `${label} added`);
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleActive(row: EmployeeLookupRow) {
    startTransition(async () => {
      const result = await setEmployeeLookupActiveAction(kind, row._id, !row.isActive);
      if (!result.success) toast.error(result.error);
    });
  }

  async function handleDelete(row: EmployeeLookupRow) {
    if (!(await confirmAction({ title: `Delete "${row.name}"?`, description: "This can't be undone." }))) return;
    startTransition(async () => {
      const result = await deleteEmployeeLookupAction(kind, row._id);
      if (result.success) toast.success(`${label} deleted`);
      else toast.error(result.error);
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    const reordered = [...rows];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      const result = await reorderEmployeeLookupAction({ kind, orderedIds: reordered.map((r) => r._id) });
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-48 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()}s...`} className="pl-9" />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add {label}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title={`No ${label.toLowerCase()}s found`} description={`Try a different search, or add a new ${label.toLowerCase()}.`} />
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((row, index) => (
            <div key={row._id} className="flex items-center justify-between gap-3 px-4 py-3">
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
                  <p className="text-sm font-medium">{row.name}</p>
                  {supportsCode && row.code && <p className="text-xs text-muted-foreground">{row.code}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={row.isActive} onCheckedChange={() => handleToggleActive(row)} disabled={isPending} />
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row)} disabled={isPending} aria-label={`Edit ${row.name}`}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row)} disabled={isPending} aria-label={`Delete ${row.name}`}>
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
            <DialogTitle>{editing?.mode === "edit" ? `Edit ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${kind}-name`}>Name</Label>
              <Input id={`${kind}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${label}`} />
            </div>
            {supportsCode && (
              <div className="space-y-1.5">
                <Label htmlFor={`${kind}-code`}>Code (Optional)</Label>
                <Input id={`${kind}-code`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ENG" />
              </div>
            )}
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

export function EmployeeLookupManagementPanel({ rowsByKind }: { rowsByKind: Record<EmployeeLookupKind, EmployeeLookupRow[]> }) {
  return (
    <Tabs defaultValue="group">
      <TabsList>
        {EMPLOYEE_LOOKUP_KINDS.map((kind) => (
          <TabsTrigger key={kind} value={kind}>
            {EMPLOYEE_LOOKUP_LABELS[kind]}
          </TabsTrigger>
        ))}
      </TabsList>
      {EMPLOYEE_LOOKUP_KINDS.map((kind) => (
        <TabsContent key={kind} value={kind} className="pt-6">
          <EmployeeLookupList kind={kind} rows={rowsByKind[kind]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
