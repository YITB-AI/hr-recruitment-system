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
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto p-4">
        {PIPELINE_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} applicants={data[status]} />
        ))}
      </div>
    </DndContext>
  );
}
