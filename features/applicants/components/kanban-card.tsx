"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { ScoreBadge } from "@/features/applicants/components/score-badge";
import { cn } from "@/lib/utils";
import type { ApplicantListRow } from "@/server/repositories/applicant.repository";

export function KanbanCard({ applicant }: { applicant: ApplicantListRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: applicant._id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "cursor-grab space-y-1.5 rounded-lg border bg-card p-3 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/applicants/${applicant._id}`}
          className="font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {applicant.name}
        </Link>
        <ScoreBadge score={applicant.score} />
      </div>
      <p className="truncate text-xs text-muted-foreground">{applicant.jobId?.title ?? "—"}</p>
      <p className="text-xs capitalize text-muted-foreground">{(applicant.source || "unknown").replace("_", " ")}</p>
    </div>
  );
}
