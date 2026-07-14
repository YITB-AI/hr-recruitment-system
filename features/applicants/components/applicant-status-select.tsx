"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateApplicantStatusAction } from "@/actions/applicants";
import { APPLICANT_STATUSES, APPLICANT_STATUS_CONFIG, type ApplicantStatus } from "@/constants/applicant-status";

const STATUS_ITEMS = APPLICANT_STATUSES.map((status) => ({ value: status, label: APPLICANT_STATUS_CONFIG[status].label }));

export function ApplicantStatusSelect({ applicantId, status }: { applicantId: string; status: ApplicantStatus }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    startTransition(async () => {
      const result = await updateApplicantStatusAction(applicantId, value as ApplicantStatus);
      if (result.success) toast.success(`Status changed to ${APPLICANT_STATUS_CONFIG[value as ApplicantStatus].label}`);
      else toast.error(result.error);
    });
  }

  return (
    <Select items={STATUS_ITEMS} value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPLICANT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {APPLICANT_STATUS_CONFIG[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
