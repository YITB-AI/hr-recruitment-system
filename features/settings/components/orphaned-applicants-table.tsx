"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { repairOrphanedApplicantAction } from "@/actions/settings";
import type { OrphanedApplicantRow } from "@/features/settings/services/data-repair.service";
import type { CompanyRow } from "@/server/repositories/company.repository";

export function OrphanedApplicantsTable({
  applicants,
  companies,
}: {
  applicants: OrphanedApplicantRow[];
  companies: CompanyRow[];
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  if (applicants.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No orphaned applicant records"
        description="Records inserted with a mismatched companyId type (e.g. a raw external write) will show up here."
      />
    );
  }

  const companyItems = companies.map((c) => ({ value: c._id, label: c.name }));

  function handleRepair(applicantId: string, resolvedCompanyId: string | null) {
    const companyId = selected[applicantId] ?? resolvedCompanyId;
    if (!companyId) {
      toast.error("Select a company first");
      return;
    }
    startTransition(async () => {
      const result = await repairOrphanedApplicantAction(applicantId, companyId);
      if (!result.success) toast.error(result.error);
      else toast.success("Record repaired");
    });
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="px-4 py-3 font-medium">Applicant</th>
          <th className="px-4 py-3 font-medium">Malformed Fields</th>
          <th className="px-4 py-3 font-medium">Company</th>
          <th className="px-4 py-3 font-medium">Linked Job</th>
          <th className="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {applicants.map((applicant) => {
          const canRepair = Boolean(applicant.resolvedJobId) && Boolean(selected[applicant._id] ?? applicant.resolvedCompanyId);
          return (
            <tr key={applicant._id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <p className="font-medium">{applicant.name}</p>
                <p className="text-xs text-muted-foreground">{applicant.email}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {applicant.malformedFields.map((field) => (
                    <Badge key={field} variant="outline" className="font-mono text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                {applicant.resolvedCompanyName ? (
                  <span>{applicant.resolvedCompanyName}</span>
                ) : (
                  <Select
                    items={companyItems}
                    value={selected[applicant._id] ?? ""}
                    onValueChange={(v) => setSelected((prev) => ({ ...prev, [applicant._id]: v ?? "" }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </td>
              <td className="px-4 py-3 text-foreground/80">
                {applicant.resolvedJobTitle ?? (
                  <span className="text-destructive">Job not found — can't auto-repair</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  onClick={() => handleRepair(applicant._id, applicant.resolvedCompanyId)}
                  disabled={isPending || !canRepair}
                >
                  Repair
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
