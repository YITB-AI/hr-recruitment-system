import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { UpcomingInterview } from "@/types/dashboard";

export function UpcomingInterviews({ items }: { items: UpcomingInterview[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No interviews scheduled"
        description="Interviews you schedule with candidates will appear here."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const date = new Date(item.scheduledAt);
        return (
          <li key={item.id} className="flex gap-3">
            <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border bg-muted/40 py-1.5">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {format(date, "MMM")}
              </span>
              <span className="text-sm font-semibold leading-tight">{format(date, "d")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{format(date, "h:mm a")}</p>
              <p className="truncate text-sm text-foreground/90">{item.applicantName}</p>
              <p className="truncate text-xs text-muted-foreground">{item.jobTitle}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
