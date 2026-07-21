"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { JOB_STATUSES } from "@/constants/job";
import type { DepartmentRow } from "@/server/repositories/department.repository";

const STATUS_TABS = [{ value: undefined, label: "All Jobs" }, ...JOB_STATUSES.map((status) => ({ value: status, label: status }))];

const SORT_ITEMS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
];

const ALL_DEPARTMENTS = "__all__";

export function JobFilters({ departments }: { departments: DepartmentRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [, startNavigating] = useTransition();

  const currentStatus = searchParams.get("status") ?? undefined;
  const currentSort = searchParams.get("sort") ?? "newest";
  const currentDepartment = searchParams.get("department") ?? "";
  const showArchived = searchParams.get("archived") === "1";

  const departmentItems = [
    { value: ALL_DEPARTMENTS, label: "All Departments" },
    ...departments.map((d) => ({ value: d.name, label: d.name })),
  ];

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.set("page", "1");
    startNavigating(() => router.push(`${pathname}?${params.toString()}`));
  }

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
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={departmentItems}
          value={currentDepartment || ALL_DEPARTMENTS}
          onValueChange={(v) => navigate({ department: v === ALL_DEPARTMENTS ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departmentItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select items={SORT_ITEMS} value={currentSort} onValueChange={(v) => navigate({ sort: v ?? undefined })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showArchived} onCheckedChange={(v) => navigate({ archived: v ? "1" : undefined })} />
          Show archived
        </label>

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
            placeholder="Search jobs..."
            className="pl-9"
          />
        </form>
      </div>
    </div>
  );
}
