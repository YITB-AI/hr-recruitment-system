"use client";

import { Mail, MessageSquareText, Phone, FileAudio } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { EMAIL_TEMPLATE_LABELS } from "@/constants/email";
import { FOLLOWUP_OUTCOME_LABELS } from "@/constants/followup";
import type { CommunicationEntry } from "@/features/applicants/services/applicant.service";

const CHANNEL_ICONS = { email: Mail, call: Phone, sms: MessageSquareText, whatsapp: MessageSquareText } as const;
const CHANNEL_LABELS = { email: "Email", call: "AI Call", sms: "SMS", whatsapp: "WhatsApp" } as const;

function formatDateTime(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ isFailed, label }: { isFailed: boolean; label: string }) {
  return (
    <Badge variant={isFailed ? "destructive" : "outline"} className="capitalize">
      {label.replace(/_/g, " ")}
    </Badge>
  );
}

export function ApplicantCommunicationHistoryTab({ entries }: { entries: CommunicationEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No communication yet"
        description="Emails, SMS, and AI calls sent to this applicant will show up here with full detail."
      />
    );
  }

  return (
    <ul className="divide-y">
      {entries.map((entry) => {
        const Icon = CHANNEL_ICONS[entry.channel];
        const isFailed = entry.channel === "email" ? entry.email.status === "failed" : entry.followup.status === "failed";

        return (
          <li key={`${entry.channel}-${entry._id}`} className="flex items-start gap-3 py-4">
            <div
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                isFailed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {entry.channel === "email" ? EMAIL_TEMPLATE_LABELS[entry.email.template] : CHANNEL_LABELS[entry.channel]}
                </p>
                {entry.channel === "email" ? (
                  <StatusBadge isFailed={isFailed} label={entry.email.status} />
                ) : entry.followup.status === "completed" && entry.followup.outcome ? (
                  <StatusBadge isFailed={false} label={FOLLOWUP_OUTCOME_LABELS[entry.followup.outcome]} />
                ) : (
                  <StatusBadge isFailed={isFailed} label={entry.followup.status} />
                )}
              </div>

              {entry.channel === "email" && (
                <p className="mt-0.5 text-xs text-muted-foreground">To {entry.email.to}</p>
              )}

              {entry.channel === "call" && entry.followup.message && (
                <p className="mt-1 text-xs text-muted-foreground">Prompt: {entry.followup.message}</p>
              )}
              {entry.channel === "call" && entry.followup.summary && (
                <p className="mt-1 text-sm text-foreground/90">{entry.followup.summary}</p>
              )}
              {entry.channel === "call" && entry.followup.transcript && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-primary">View transcript</summary>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{entry.followup.transcript}</p>
                </details>
              )}
              {entry.channel === "call" && entry.followup.recordingUrl && (
                <a
                  href={entry.followup.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileAudio className="size-3.5" />
                  Listen to recording
                </a>
              )}

              {(entry.channel === "email" ? entry.email.error : entry.followup.error) && (
                <p className="mt-1 text-xs text-destructive">
                  {entry.channel === "email" ? entry.email.error : entry.followup.error}
                </p>
              )}

              <p className="mt-1 text-xs text-muted-foreground/70">{formatDateTime(entry.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
