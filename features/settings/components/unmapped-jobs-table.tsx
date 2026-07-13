"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignJobToCompanyAction } from "@/actions/settings";
import type { CompanyRow } from "@/server/repositories/company.repository";

type UnmappedJob = { _id: string; job_id: string; title: string; department: string; city: string; country: string };

export function UnmappedJobsTable({ jobs, companies }: { jobs: UnmappedJob[]; companies: CompanyRow[] }) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No unmapped jobs"
        description="Every job from the n8n pipeline is already assigned to a company."
      />
    );
  }

  function handleAssign(jobId: string) {
    const companyId = selected[jobId];
    if (!companyId) {
      toast.error("Select a company first");
      return;
    }
    startTransition(async () => {
      const result = await assignJobToCompanyAction(jobId, companyId);
      if (!result.success) toast.error(result.error);
      else toast.success("Job assigned");
    });
  }

  const companyItems = companies.map((c) => ({ value: c._id, label: c.name }));

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="px-4 py-3 font-medium">Job</th>
          <th className="px-4 py-3 font-medium">Department</th>
          <th className="px-4 py-3 font-medium">Location</th>
          <th className="px-4 py-3 font-medium">Assign to company</th>
          <th className="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {jobs.map((job) => (
          <tr key={job._id} className="hover:bg-muted/30">
            <td className="px-4 py-3">
              <p className="font-medium">{job.title}</p>
              <p className="text-xs text-muted-foreground">{job.job_id}</p>
            </td>
            <td className="px-4 py-3 text-foreground/80">{job.department || "—"}</td>
            <td className="px-4 py-3 text-foreground/80">
              {[job.city, job.country].filter(Boolean).join(", ") || "—"}
            </td>
            <td className="px-4 py-3">
              <Select
                items={companyItems}
                value={selected[job._id] ?? ""}
                onValueChange={(v) => setSelected((prev) => ({ ...prev, [job._id]: v ?? "" }))}
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
            </td>
            <td className="px-4 py-3 text-right">
              <Button size="sm" onClick={() => handleAssign(job._id)} disabled={isPending || !selected[job._id]}>
                Assign
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
