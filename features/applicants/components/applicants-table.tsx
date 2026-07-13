"use client";

import Link from "next/link";
import { Users, ArrowUp, ArrowDown } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreBadge } from "@/features/applicants/components/score-badge";
import type { ApplicantListRow } from "@/server/repositories/applicant.repository";

type ApplicantsTableProps = {
  applicants: ApplicantListRow[];
  sortBy?: "createdAt" | "score";
  sortDir?: "asc" | "desc";
  scoreSortHref: string;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
};

export function ApplicantsTable({
  applicants,
  sortBy,
  sortDir,
  scoreSortHref,
  selectedIds,
  onToggleOne,
  onToggleAll,
}: ApplicantsTableProps) {
  if (applicants.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No applicants match these filters"
        description="Try widening your filters, or check back once applicants apply to your open roles."
      />
    );
  }

  const isScoreSorted = sortBy === "score";
  const allSelected = applicants.length > 0 && applicants.every((a) => selectedIds.has(a._id));

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
        <tr>
          <th className="w-10 px-4 py-3">
            <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all on this page" />
          </th>
          <th className="px-4 py-3 font-medium">Applicant</th>
          <th className="px-4 py-3 font-medium">Job</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Source</th>
          <th className="px-4 py-3 font-medium">Applied On</th>
          <th className="px-4 py-3 font-medium">
            <Link href={scoreSortHref} className="inline-flex items-center gap-1 hover:text-foreground">
              Score
              {isScoreSorted &&
                (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
            </Link>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {applicants.map((applicant) => (
          <tr key={applicant._id} className="hover:bg-muted/30">
            <td className="px-4 py-3">
              <Checkbox
                checked={selectedIds.has(applicant._id)}
                onCheckedChange={() => onToggleOne(applicant._id)}
                aria-label={`Select ${applicant.name}`}
              />
            </td>
            <td className="px-4 py-3">
              <Link href={`/applicants/${applicant._id}`} className="font-medium hover:underline">
                {applicant.name}
              </Link>
              <p className="text-xs text-muted-foreground">{applicant.email}</p>
            </td>
            <td className="px-4 py-3 text-foreground/80">{applicant.jobId?.title ?? "—"}</td>
            <td className="px-4 py-3">
              <StatusBadge status={applicant.status} />
            </td>
            <td className="px-4 py-3 capitalize text-foreground/80">{applicant.source.replace("_", " ")}</td>
            <td className="px-4 py-3 text-foreground/80">
              {new Date(applicant.appliedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </td>
            <td className="px-4 py-3">
              <ScoreBadge score={applicant.score} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
