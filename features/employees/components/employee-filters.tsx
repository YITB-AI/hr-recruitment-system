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
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS } from "@/constants/employee";

const STATUS_TABS = [
  { value: undefined, label: "All Employees" },
  ...EMPLOYMENT_STATUSES.map((status) => ({ value: status, label: EMPLOYMENT_STATUS_LABELS[status] })),
];

export function EmployeeFilters({ departments }: { departments: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [, startNavigating] = useTransition();

  const currentStatus = searchParams.get("status") ?? undefined;
  const currentDepartment = searchParams.get("department") ?? "";

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
