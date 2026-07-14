import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { ActivityLogRow } from "@/server/repositories/activity-log.repository";

export function ActivityLogTable({ items }: { items: ActivityLogRow[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Actions across jobs, applicants, and interviews will show up here."
      />
    );
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item._id} className="flex items-start gap-3 px-4 py-4">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground/90">{item.message}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              {item.actorName ? ` · ${item.actorName}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
