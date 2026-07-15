import { formatDistanceToNow } from "date-fns";
import { FOLLOWUP_TYPE_LABELS, FOLLOWUP_OUTCOME_LABELS } from "@/constants/followup";
import type { ApplicantFollowupRow } from "@/server/repositories/applicant-followup.repository";

function followupStatusText(row: ApplicantFollowupRow): string {
  const channel = FOLLOWUP_TYPE_LABELS[row.type];
  if (row.status === "in_progress") return `${channel} in progress`;
  if (row.status === "pending") return `${channel} requested`;
  if (row.status === "failed") return `${channel} failed`;
  if (row.status === "completed" && row.outcome) return `${channel}: ${FOLLOWUP_OUTCOME_LABELS[row.outcome]}`;
  return `${channel} sent`;
}

export function FollowupStatusIndicator({ latest }: { latest: ApplicantFollowupRow | null }) {
  if (!latest) return null;

  const isFailed = latest.status === "failed";
  const isInProgress = latest.status === "in_progress";

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
      <span
        className={`size-1.5 shrink-0 rounded-full ${
          isFailed ? "bg-destructive" : isInProgress ? "animate-pulse bg-primary" : "bg-muted-foreground/40"
        }`}
      />
      <span className={isFailed ? "text-destructive" : "text-foreground"}>{followupStatusText(latest)}</span>
      <span className="text-muted-foreground">
        · {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}
