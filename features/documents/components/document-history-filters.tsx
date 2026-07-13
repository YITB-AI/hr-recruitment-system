"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Kept as a local literal (not imported from "@/models") — this is a client
// component, and models/Document.ts pulls in mongoose/mongodb, which can't
// be bundled for the browser.
const DOCUMENT_STATUSES = ["generated", "sent", "signed"] as const;

const STATUS_TABS = [
  { value: undefined, label: "All Documents" },
  ...DOCUMENT_STATUSES.map((status) => ({ value: status, label: status[0].toUpperCase() + status.slice(1) })),
];

const RECIPIENT_TYPE_ITEMS = [
  { value: "__all__", label: "All Recipients" },
  { value: "employee", label: "Employees" },
  { value: "applicant", label: "Applicants" },
];

type Template = { _id: string; name: string };

export function DocumentHistoryFilters({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startNavigating] = useTransition();

  const currentStatus = searchParams.get("status") ?? undefined;
  const currentTemplateId = searchParams.get("templateId") ?? "";
  const currentRecipientType = searchParams.get("recipientType") ?? "";
  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";
  const currentBatchId = searchParams.get("batchId") ?? "";

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.set("page", "1");
    startNavigating(() => router.push(`${pathname}?${params.toString()}`));
  }

  const templateItems = [{ value: "__all__", label: "All Templates" }, ...templates.map((t) => ({ value: t._id, label: t.name }))];

  return (
    <div className="space-y-4">
      {currentBatchId && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          <span>Showing documents from one batch generation</span>
          <button onClick={() => navigate({ batchId: undefined })} className="inline-flex items-center hover:underline">
            <X className="size-3.5" /> Clear
          </button>
        </div>
      )}

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
          items={templateItems}
          value={currentTemplateId || "__all__"}
          onValueChange={(v) => navigate({ templateId: v === "__all__" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templateItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={RECIPIENT_TYPE_ITEMS}
          value={currentRecipientType || "__all__"}
          onValueChange={(v) => navigate({ recipientType: v === "__all__" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECIPIENT_TYPE_ITEMS.map((item) => (
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
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={currentDateTo}
            onChange={(e) => navigate({ dateTo: e.target.value || undefined })}
            className="w-36"
            aria-label="To date"
          />
        </div>

        {(currentStatus || currentTemplateId || currentRecipientType || currentDateFrom || currentDateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate({ status: undefined, templateId: undefined, recipientType: undefined, dateFrom: undefined, dateTo: undefined })
            }
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
