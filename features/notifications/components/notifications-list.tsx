"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { markNotificationReadAction } from "@/actions/notifications";
import type { NotificationRow } from "@/server/repositories/notification.repository";

export function NotificationsList({ notifications }: { notifications: NotificationRow[] }) {
  const [isPending, startTransition] = useTransition();

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (!result.success) toast.error(result.error);
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-2xl border bg-card">
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="New activity will show up here in real time."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {notifications.map((n) => (
        <li key={n._id} className="flex items-start gap-3 px-4 py-4">
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.message}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
            </p>
          </div>
          {!n.read && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => handleMarkRead(n._id)}
            >
              <Check className="size-4" />
              Mark read
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
