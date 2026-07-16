"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { History, MoreVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SendEmailDialog } from "@/features/applicants/components/send-email-dialog";
import { deleteInterviewAction } from "@/actions/interviews";
import type { InterviewRow } from "@/server/repositories/interview.repository";
import type { ActivityLogRow } from "@/server/repositories/activity-log.repository";

export type LatestEmailInfo = { template: string; status: string; createdAt: Date } | null;

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function InterviewActivityDialog({ activity }: { activity: ActivityLogRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} title="View activity">
        <History className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Interview Activity</DialogTitle>
        </DialogHeader>
        {activity.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Changes to this interview will show up here." />
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {activity.map((entry) => (
              <li key={entry._id} className="py-3">
                <p className="text-sm">{entry.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                  {entry.actorName ? ` · ${entry.actorName}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InterviewActions({
  interview,
  latestEmail,
  activity,
}: {
  interview: InterviewRow;
  latestEmail: LatestEmailInfo;
  activity: ActivityLogRow[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this interview? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deleteInterviewAction(interview._id);
      if (!result.success) toast.error(result.error);
      else toast.success("Interview deleted");
    });
  }

  if (!interview.applicantId) return null;

  const isTerminal = interview.status === "rescheduled" || interview.status === "cancelled";
  const isFuture = new Date(interview.scheduledAt).getTime() > Date.now();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {latestEmail && (
        <Badge variant="outline" className="whitespace-nowrap">
          Sent {formatDistanceToNow(new Date(latestEmail.createdAt), { addSuffix: true })}
        </Badge>
      )}
      {isTerminal ? (
        <span className="text-sm text-muted-foreground">No actions available</span>
      ) : isFuture ? (
        <>
          <SendEmailDialog
            applicantId={interview.applicantId._id}
            applicantEmail={interview.applicantId.email}
            template="interview_invite"
            interviewId={interview._id}
            triggerLabel="Resend Email"
            triggerVariant="ghost"
            triggerClassName="h-8"
          />
          <SendEmailDialog
            applicantId={interview.applicantId._id}
            applicantEmail={interview.applicantId.email}
            template="interview_reminder"
            interviewId={interview._id}
            triggerLabel="Send Reminder"
            triggerVariant="ghost"
            triggerClassName="h-8"
          />
        </>
      ) : (
        <Button
          variant="ghost"
          className="h-8"
          nativeButton={false}
          render={
            <Link href={`/applicants/${interview.applicantId._id}/schedule-interview?rescheduleFrom=${interview._id}`} />
          }
        >
          Reschedule Interview
        </Button>
      )}

      <InterviewActivityDialog activity={activity} />

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}>
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Delete Interview
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
