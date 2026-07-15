"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Clock, Mail, MailWarning, MessageSquareText, Phone, PhoneCall, PhoneMissed, RotateCw, StickyNote } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sendApplicantEmailAction } from "@/actions/email";
import { FOLLOWUP_OUTCOME_LABELS } from "@/constants/followup";
import type { ApplicantTimelineEntry } from "@/features/applicants/services/applicant.service";

const FOLLOWUP_ICONS = { call: Phone, sms: MessageSquareText, whatsapp: MessageSquareText, email: Mail } as const;

function followupBadgeLabel(followup: Extract<ApplicantTimelineEntry, { kind: "followup" }>["followup"]): string {
  if (followup.status === "completed" && followup.outcome) return FOLLOWUP_OUTCOME_LABELS[followup.outcome];
  return followup.status.replace(/_/g, " ");
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ApplicantHistoryTab({ applicantId, entries }: { applicantId: string; entries: ApplicantTimelineEntry[] }) {
  const [isPending, startTransition] = useTransition();

  function handleRetry(entry: Extract<ApplicantTimelineEntry, { kind: "email" }>) {
    startTransition(async () => {
      const result = await sendApplicantEmailAction({
        applicantId,
        template: entry.email.template,
        interviewId: entry.email.interviewId ?? undefined,
      });
      if (result.success) toast.success("Email sent");
      else toast.error(result.error);
    });
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No activity yet"
        description="Status changes and emails sent to this applicant will show up here."
      />
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => {
        const isFailedEmail = entry.kind === "email" && entry.email.status === "failed";
        const isFailedFollowup = entry.kind === "followup" && entry.followup.status === "failed";
        const isInProgressFollowup = entry.kind === "followup" && entry.followup.status === "in_progress";
        const isFailed = isFailedEmail || isFailedFollowup;

        const Icon =
          entry.kind === "email"
            ? isFailedEmail
              ? MailWarning
              : Mail
            : entry.kind === "followup"
              ? isFailedFollowup
                ? PhoneMissed
                : isInProgressFollowup
                  ? PhoneCall
                  : FOLLOWUP_ICONS[entry.followup.type]
              : entry.kind === "note"
                ? StickyNote
                : Clock;

        return (
          <li key={`${entry.kind}-${entry._id}`} className="flex items-start justify-between gap-3 py-3">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  isFailed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{entry.message}</p>
                  {entry.kind === "followup" && (
                    <Badge variant={isFailedFollowup ? "destructive" : "outline"} className="capitalize">
                      {followupBadgeLabel(entry.followup)}
                    </Badge>
                  )}
                </div>
                {entry.kind === "note" && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{entry.note.body}</p>}
                {entry.kind === "followup" && entry.followup.status === "completed" && entry.followup.summary && (
                  <p className="mt-1 text-xs text-muted-foreground">{entry.followup.summary}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                  {entry.actorName ? ` · ${entry.actorName}` : ""}
                </p>
                {entry.kind === "email" && entry.email.error && (
                  <p className="mt-1 text-xs text-destructive">{entry.email.error}</p>
                )}
                {entry.kind === "followup" && entry.followup.error && (
                  <p className="mt-1 text-xs text-destructive">{entry.followup.error}</p>
                )}
              </div>
            </div>
            {isFailedEmail && (
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleRetry(entry)}>
                <RotateCw className="size-3.5" />
                Retry
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
