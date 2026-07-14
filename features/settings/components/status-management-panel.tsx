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
  createStatusAction,
  updateStatusAction,
  setStatusActiveAction,
  deleteStatusAction,
  reorderStatusesAction,
} from "@/actions/statuses";
import { STATUS_MODULES, STATUS_MODULE_LABELS, type StatusModule } from "@/constants/status-module";
import type { StatusRow } from "@/server/repositories/status.repository";

type EditingState = { mode: "create"; module: StatusModule } | { mode: "edit"; status: StatusRow } | null;

function StatusModuleList({ module, statuses }: { module: StatusModule; statuses: StatusRow[] }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2a78d6");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => statuses.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [statuses, search],
  );

  function openCreate() {
    setName("");
    setColor("#2a78d6");
    setEditing({ mode: "create", module });
  }

  function openEdit(status: StatusRow) {
    setName(status.name);
    setColor(status.color);
    setEditing({ mode: "edit", status });
  }

  function handleSave() {
    startTransition(async () => {
      const result =
        editing?.mode === "edit"
          ? await updateStatusAction({ id: editing.status._id, name, color })
          : await createStatusAction({ module, name, color });

      if (result.success) {
        toast.success(editing?.mode === "edit" ? "Status updated" : "Status added");
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleActive(status: StatusRow) {
    startTransition(async () => {
      const result = await setStatusActiveAction(status._id, module, !status.isActive);
      if (!result.success) toast.error(result.error);
    });
  }

  function handleDelete(status: StatusRow) {
    if (!confirm(`Delete "${status.name}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteStatusAction(status._id, module);
      if (result.success) toast.success("Status deleted");
      else toast.error(result.error);
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= statuses.length) return;
    const reordered = [...statuses];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    startTransition(async () => {
      const result = await reorderStatusesAction({ module, orderedIds: reordered.map((s) => s._id) });
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-48 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search statuses..." className="pl-9" />
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add Status
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No statuses found" description="Try a different search, or add a new status." />
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((status, index) => (
            <div key={status._id} className="flex items-center justify-between gap-3 px-4 py-3">
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
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                <div>
                  <p className="text-sm font-medium">{status.name}</p>
                  <p className="text-xs text-muted-foreground">{status.key}</p>
                </div>
                {status.isDefault && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Default</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={status.isActive} onCheckedChange={() => handleToggleActive(status)} disabled={isPending} />
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(status)} disabled={isPending}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(status)} disabled={isPending}>
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
            <DialogTitle>{editing?.mode === "edit" ? "Edit status" : "Add status"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="status-name">Name</Label>
              <Input id="status-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Under Review" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="status-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-8 shrink-0 cursor-pointer rounded-md border"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
              </div>
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

export function StatusManagementPanel({ statusesByModule }: { statusesByModule: Record<StatusModule, StatusRow[]> }) {
  return (
    <Tabs defaultValue="applicant">
      <TabsList>
        {STATUS_MODULES.map((module) => (
          <TabsTrigger key={module} value={module}>
            {STATUS_MODULE_LABELS[module]}
          </TabsTrigger>
        ))}
      </TabsList>
      {STATUS_MODULES.map((module) => (
        <TabsContent key={module} value={module} className="pt-6">
          <StatusModuleList module={module} statuses={statusesByModule[module]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
