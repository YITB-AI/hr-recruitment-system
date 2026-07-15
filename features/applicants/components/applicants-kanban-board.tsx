"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "@/features/applicants/components/kanban-column";
import { updateApplicantStatusAction } from "@/actions/applicants";
import { PIPELINE_STATUSES, type ApplicantStatus } from "@/constants/applicant-status";
import type { ApplicantListRow } from "@/server/repositories/applicant.repository";

type BoardData = Record<ApplicantStatus, ApplicantListRow[]>;

export function ApplicantsKanbanBoard({ initialData }: { initialData: BoardData }) {
  const [data, setData] = useState(initialData);
  const [, startTransition] = useTransition();

  function handleDragEnd(event: DragEndEvent) {
    const applicantId = String(event.active.id);
    const nextStatus = event.over?.id as ApplicantStatus | undefined;
    if (!nextStatus || !PIPELINE_STATUSES.includes(nextStatus)) return;

    const currentStatus = (Object.keys(data) as ApplicantStatus[]).find((status) =>
      data[status].some((a) => a._id === applicantId),
    );
    if (!currentStatus || currentStatus === nextStatus) return;

    const applicant = data[currentStatus].find((a) => a._id === applicantId)!;
    const previousData = data;

    // Optimistic move, with rollback on failure.
    setData((prev) => ({
      ...prev,
      [currentStatus]: prev[currentStatus].filter((a) => a._id !== applicantId),
      [nextStatus]: [{ ...applicant, status: nextStatus }, ...prev[nextStatus]],
    }));

    startTransition(async () => {
      const result = await updateApplicantStatusAction(applicantId, nextStatus);
      if (!result.success) {
        toast.error(result.error);
        setData(previousData);
      }
    });
  }

  return (
    // Explicit id: dnd-kit's default falls back to an auto-incrementing
    // module-level counter for the aria-describedby it generates, which
    // isn't guaranteed to match between the server render and the client's
    // hydration render once more than one DndContext has mounted in the
    // session (e.g. after client-side navigation) — causing a hydration
    // mismatch warning. A stable explicit id makes it deterministic.
    <DndContext id="applicants-kanban" onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto p-4">
        {PIPELINE_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} applicants={data[status]} />
        ))}
      </div>
    </DndContext>
  );
}
