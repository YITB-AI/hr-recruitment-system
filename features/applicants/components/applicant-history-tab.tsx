"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Clock, Mail, MailWarning, RotateCw } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { sendApplicantEmailAction } from "@/actions/email";
import type { ApplicantTimelineEntry } from "@/features/applicants/services/applicant.service";

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
        const Icon = entry.kind === "email" ? (isFailedEmail ? MailWarning : Mail) : Clock;

        return (
          <li key={`${entry.kind}-${entry._id}`} className="flex items-start justify-between gap-3 py-3">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  isFailedEmail ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-sm">{entry.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                  {entry.actorName ? ` · ${entry.actorName}` : ""}
                </p>
                {entry.kind === "email" && entry.email.error && (
                  <p className="mt-1 text-xs text-destructive">{entry.email.error}</p>
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
