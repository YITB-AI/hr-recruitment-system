"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "@/features/applicants/components/kanban-card";
import { useStatusLookup } from "@/components/shared/status-config-provider";
import { cn } from "@/lib/utils";
import type { ApplicantStatus } from "@/constants/applicant-status";
import type { ApplicantListRow } from "@/server/repositories/applicant.repository";

export function KanbanColumn({ status, applicants }: { status: ApplicantStatus; applicants: ApplicantListRow[] }) {
  // "Interview Scheduled" is drop-disabled: dropping here would only flip
  // the status field without creating a real Interview record. Forcing that
  // transition through the real schedule-interview form keeps the two in
  // sync — see the note in bulk-actions-bar.tsx for the same caveat.
  const disabled = status === "interview";
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled });
  const { getStatus } = useStatusLookup();
  const config = getStatus(status);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: config.color }} />
          {config.name}
        </span>
        <span className="text-xs text-muted-foreground">{applicants.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          isOver && !disabled && "bg-primary/5",
          disabled && "opacity-90",
        )}
        style={{ minHeight: 120, maxHeight: 560 }}
      >
        {applicants.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">No applicants</p>
        )}
        {applicants.map((applicant) => (
          <KanbanCard key={applicant._id} applicant={applicant} />
        ))}
        {disabled && (
          <p className="p-2 text-center text-xs text-muted-foreground">
            Use "Schedule Interview" on an applicant's page to move them here
          </p>
        )}
      </div>
    </div>
  );
}
