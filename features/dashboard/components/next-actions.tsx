import { formatDistanceToNow } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { NextActionItem } from "@/types/dashboard";

export function NextActions({ items }: { items: NextActionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing needs your attention"
        description="AI call outcomes and other items that need manual review will show up here."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground/90">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.message}</p>
            <p className="text-xs text-muted-foreground/70">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
