"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Mail, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkUpdateStatusAction, bulkSendEmailAction, bulkSendSmsAction, type BulkActionResult } from "@/actions/applicants";
import { APPLICANT_STATUSES, APPLICANT_STATUS_CONFIG, type ApplicantStatus } from "@/constants/applicant-status";

const STATUS_ITEMS = APPLICANT_STATUSES.map((status) => ({ value: status, label: APPLICANT_STATUS_CONFIG[status].label }));

function describeResult(result: BulkActionResult, verb: string): string {
  if (result.failures.length === 0) return `${verb} ${result.successCount} applicant${result.successCount === 1 ? "" : "s"}`;
  return `${verb} ${result.successCount}, ${result.failures.length} failed`;
}

export function BulkActionsBar({
  selectedIds,
  onClear,
}: {
  selectedIds: string[];
  onClear: () => void;
}) {
  const [statusToApply, setStatusToApply] = useState<ApplicantStatus | "">("");
  const [isPending, startTransition] = useTransition();

  if (selectedIds.length === 0) return null;

  function handleChangeStatus() {
    if (!statusToApply) return;
    startTransition(async () => {
      const result = await bulkUpdateStatusAction(selectedIds, statusToApply);
      if (result.failures.length > 0) toast.error(describeResult(result, "Updated"));
      else toast.success(describeResult(result, "Updated"));
      setStatusToApply("");
      onClear();
    });
  }

  function handleSendEmail() {
    startTransition(async () => {
      const result = await bulkSendEmailAction(selectedIds);
      if (result.failures.length > 0) toast.error(describeResult(result, "Emailed"));
      else toast.success(describeResult(result, "Emailed"));
    });
  }

  function handleSendSms() {
    startTransition(async () => {
      const result = await bulkSendSmsAction(selectedIds);
      if (result.failures.length > 0) toast.error(describeResult(result, "Texted"));
      else toast.success(describeResult(result, "Texted"));
    });
  }

  return (
    <div className="sticky bottom-4 z-10 mx-4 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-lg">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>

      <div className="flex items-center gap-2">
        <Select items={STATUS_ITEMS} value={statusToApply} onValueChange={(v) => setStatusToApply((v as ApplicantStatus) ?? "")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Change status to…" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!statusToApply || isPending} onClick={handleChangeStatus}>
          Apply
        </Button>
      </div>

      {statusToApply === "interview" && (
        <p className="text-xs text-muted-foreground">
          Sets status only — does not create an interview. Use "Schedule Interview" on the applicant's page for that.
        </p>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleSendEmail}>
          <Mail className="size-4" />
          Send Email
        </Button>
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleSendSms}>
          <MessageSquareText className="size-4" />
          Send SMS
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={onClear}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
