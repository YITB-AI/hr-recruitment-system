"use client";

import { useState } from "react";
import { ApplicantsTable } from "@/features/applicants/components/applicants-table";
import { BulkActionsBar } from "@/features/applicants/components/bulk-actions-bar";
import type { ApplicantListRow } from "@/server/repositories/applicant.repository";

type ApplicantsListViewProps = {
  applicants: ApplicantListRow[];
  sortBy?: "createdAt" | "score";
  sortDir?: "asc" | "desc";
  scoreSortHref: string;
};

export function ApplicantsListView({ applicants, sortBy, sortDir, scoreSortHref }: ApplicantsListViewProps) {
  // Plain useState, not the app's zustand store — that's reserved for
  // app-shell chrome (sidebar/command palette), not page-local list state.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const allSelected = applicants.length > 0 && applicants.every((a) => prev.has(a._id));
      if (allSelected) return new Set();
      return new Set(applicants.map((a) => a._id));
    });
  }

  return (
    <div className="space-y-3">
      <ApplicantsTable
        applicants={applicants}
        sortBy={sortBy}
        sortDir={sortDir}
        scoreSortHref={scoreSortHref}
        selectedIds={selectedIds}
        onToggleOne={toggleOne}
        onToggleAll={toggleAll}
      />
      <BulkActionsBar selectedIds={Array.from(selectedIds)} onClear={() => setSelectedIds(new Set())} />
    </div>
  );
}
