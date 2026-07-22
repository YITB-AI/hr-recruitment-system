"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, ChevronDown, Bookmark, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStatusLookup } from "@/components/shared/status-config-provider";
import { createSavedViewAction, deleteSavedViewAction } from "@/actions/saved-views";
import type { SavedViewRow } from "@/server/repositories/saved-view.repository";
import type { StatusRow } from "@/server/repositories/status.repository";

type Job = { _id: string; title: string };

export function ApplicantFilters({
  jobs,
  savedViews,
  sources,
}: {
  jobs: Job[];
  savedViews: SavedViewRow[];
  sources: StatusRow[];
}) {
  const { statuses } = useStatusLookup();
  const STATUS_TABS = [
    { value: undefined, label: "All Applicants" },
    ...statuses.map((status) => ({ value: status.key, label: status.name })),
  ];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [, startNavigating] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isDeletingView, startDeletingView] = useTransition();

  const currentStatus = searchParams.get("status") ?? undefined;
  const currentJobId = searchParams.get("jobId") ?? "";
  const currentSource = searchParams.get("source") ?? "";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";
  const currentScoreMin = searchParams.get("scoreMin") ?? "";
  const currentScoreMax = searchParams.get("scoreMax") ?? "";

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.set("page", "1");
    startNavigating(() => router.push(`${pathname}?${params.toString()}`));
  }

  function applyView(view: SavedViewRow) {
    const params = new URLSearchParams(view.filters);
    params.set("page", "1");
    startNavigating(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleSaveView() {
    if (!viewName.trim()) return;
    const filters: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === "page") continue;
      filters[key] = value;
    }
    startSaving(async () => {
      const result = await createSavedViewAction({ name: viewName.trim(), filters });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Saved view "${viewName.trim()}"`);
      setViewName("");
      setSaveDialogOpen(false);
    });
  }

  function handleDeleteView(id: string, name: string) {
    if (!confirm(`Delete saved view "${name}"?`)) return;
    startDeletingView(async () => {
      const result = await deleteSavedViewAction(id);
      if (!result.success) toast.error(result.error);
    });
  }

  const jobItems = [{ value: "__all__", label: "All Jobs" }, ...jobs.map((j) => ({ value: j._id, label: j.title }))];
  const sourceItems = [
    { value: "__all__", label: "All Sources" },
    ...sources.map((s) => ({ value: s.key, label: s.name })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.value;
          return (
            <button
              key={tab.label}
              onClick={() => navigate({ status: tab.value })}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={jobItems}
          value={currentJobId || "__all__"}
          onValueChange={(v) => navigate({ jobId: v === "__all__" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {jobItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={sourceItems}
          value={currentSource || "__all__"}
          onValueChange={(v) => navigate({ source: v === "__all__" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sourceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={currentDateFrom}
            onChange={(e) => navigate({ dateFrom: e.target.value || undefined })}
            className="w-36"
            aria-label="Applied from"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={currentDateTo}
            onChange={(e) => navigate({ dateTo: e.target.value || undefined })}
            className="w-36"
            aria-label="Applied to"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={currentScoreMin}
            onChange={(e) => navigate({ scoreMin: e.target.value || undefined })}
            placeholder="Score min"
            className="w-24"
            aria-label="Minimum score"
          />
          <span className="text-sm text-muted-foreground">–</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={currentScoreMax}
            onChange={(e) => navigate({ scoreMax: e.target.value || undefined })}
            placeholder="Score max"
            className="w-24"
            aria-label="Maximum score"
          />
        </div>

        <form
          className="relative min-w-48 max-w-sm flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: searchValue || undefined });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search applicants..."
            className="pl-9"
          />
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <Bookmark className="size-4" />
            Views
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {savedViews.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No saved views yet</div>
            ) : (
              savedViews.map((view) => (
                <DropdownMenuItem
                  key={view._id}
                  onClick={() => applyView(view)}
                  className="justify-between"
                >
                  <span className="truncate">{view.name}</span>
                  <button
                    type="button"
                    disabled={isDeletingView}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteView(view._id, view.name);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>Save current filters…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save current filters as a view</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="view-name">View name</Label>
            <Input
              id="view-name"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g. Screening — Executive Assistant"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleSaveView} disabled={isSaving || !viewName.trim()}>
              {isSaving ? "Saving..." : "Save View"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
