"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateApplicantStatusAction } from "@/actions/applicants";
import { useStatusLookup } from "@/components/shared/status-config-provider";

export function ApplicantStatusSelect({ applicantId, status }: { applicantId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const { statuses, getStatus } = useStatusLookup();
  const items = statuses.map((s) => ({ value: s.key, label: s.name }));

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    startTransition(async () => {
      const result = await updateApplicantStatusAction(applicantId, value);
      if (result.success) toast.success(`Status changed to ${getStatus(value).name}`);
      else toast.error(result.error);
    });
  }

  return (
    <Select items={items} value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((s) => (
          <SelectItem key={s.key} value={s.key}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
