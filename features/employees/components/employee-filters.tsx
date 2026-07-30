"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useStatusLookup } from "@/components/shared/status-config-provider";
import type { EmployeeLookupKind } from "@/constants/employee-lookup";
import type { EmployeeLookupRow } from "@/server/repositories/employee-lookup.repository";

type EmployeeFiltersProps = {
  departments: string[];
  lookups: Record<EmployeeLookupKind, EmployeeLookupRow[]>;
};

export function EmployeeFilters({ departments, lookups }: EmployeeFiltersProps) {
  const { statuses } = useStatusLookup();
  const STATUS_TABS = [
    { value: undefined, label: "All Employees" },
    ...statuses.map((status) => ({ value: status.key, label: status.name })),
  ];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [, startNavigating] = useTransition();

  const currentStatus = searchParams.get("status") ?? undefined;
  const currentDepartment = searchParams.get("department") ?? "";
  const currentGroupId = searchParams.get("groupId") ?? "";
  const currentRegionId = searchParams.get("regionId") ?? "";
  const currentStationId = searchParams.get("stationId") ?? "";

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.set("page", "1");
    startNavigating(() => router.push(`${pathname}?${params.toString()}`));
  }

  const departmentItems = [
    { value: "__all__", label: "All Departments" },
    ...departments.map((d) => ({ value: d, label: d })),
  ];
  const groupItems = [{ value: "__all__", label: "All Groups" }, ...lookups.group.map((g) => ({ value: g._id, label: g.name }))];
  const regionItems = [{ value: "__all__", label: "All Regions" }, ...lookups.region.map((r) => ({ value: r._id, label: r.name }))];
  const stationItems = [{ value: "__all__", label: "All Stations" }, ...lookups.station.map((s) => ({ value: s._id, label: s.name }))];

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
          items={departmentItems}
          value={currentDepartment || "__all__"}
          onValueChange={(v) => navigate({ department: v === "__all__" ? undefined : (v ?? undefined) })}
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

        <Select
          items={groupItems}
          value={currentGroupId || "__all__"}
          onValueChange={(v) => navigate({ groupId: v === "__all__" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={regionItems}
          value={currentRegionId || "__all__"}
          onValueChange={(v) => navigate({ regionId: v === "__all__" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {regionItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={stationItems}
          value={currentStationId || "__all__"}
          onValueChange={(v) => navigate({ stationId: v === "__all__" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stationItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <form
          className="relative flex-1 min-w-48 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: searchValue || undefined });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search employee..."
            className="pl-9"
          />
        </form>
      </div>
    </div>
  );
}
