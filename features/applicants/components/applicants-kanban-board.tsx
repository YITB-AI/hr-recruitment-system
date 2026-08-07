"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DndContext, type Announcements, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "@/features/applicants/components/kanban-column";
import { useStatusLookup } from "@/components/shared/status-config-provider";
import { updateApplicantStatusAction } from "@/actions/applicants";
import { PIPELINE_STATUSES, type ApplicantStatus } from "@/constants/applicant-status";
import type { ApplicantListRow } from "@/server/repositories/applicant.repository";

type BoardData = Record<ApplicantStatus, ApplicantListRow[]>;

export function ApplicantsKanbanBoard({ initialData }: { initialData: BoardData }) {
  const [data, setData] = useState(initialData);
  const [, startTransition] = useTransition();
  const { getStatus } = useStatusLookup();

  function applicantName(id: string): string {
    for (const status of PIPELINE_STATUSES) {
      const found = data[status].find((a) => a._id === id);
      if (found) return found.name;
    }
    return "This applicant";
  }

  // dnd-kit's built-in default announcements interpolate the raw draggable/
  // droppable id verbatim (a Mongo ObjectId / pipeline-status key) into the
  // screen-reader live region — a blind/keyboard user would hear "Picked up
  // draggable item 66f3a2e1...", not the applicant's name or the target
  // stage. Overridden here to speak human-readable text instead.
  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up ${applicantName(String(active.id))}.`;
    },
    onDragOver({ active, over }) {
      if (!over) return `${applicantName(String(active.id))} is no longer over a pipeline stage.`;
      return `${applicantName(String(active.id))} is over the ${getStatus(String(over.id)).name} stage.`;
    },
    onDragEnd({ active, over }) {
      if (!over) return `${applicantName(String(active.id))} was dropped.`;
      return `${applicantName(String(active.id))} was moved to the ${getStatus(String(over.id)).name} stage.`;
    },
    onDragCancel({ active }) {
      return `Moving ${applicantName(String(active.id))} was cancelled.`;
    },
  };

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
    <DndContext id="applicants-kanban" onDragEnd={handleDragEnd} accessibility={{ announcements }}>
      <div className="flex gap-3 overflow-x-auto p-4">
        {PIPELINE_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} applicants={data[status]} />
        ))}
      </div>
    </DndContext>
  );
}
