"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markNotificationReadAction } from "@/actions/notifications";
import { NOTIFICATION_TYPE_ICON, NOTIFICATION_PRIORITY_COLOR } from "@/features/notifications/lib/notification-icons";
import type { NotificationRow as NotificationRowData } from "@/server/repositories/notification.repository";

export function NotificationRow({ notification }: { notification: NotificationRowData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isSelected = searchParams.get("selected") === notification._id;
  const Icon = NOTIFICATION_TYPE_ICON[notification.type];

  function select() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", notification._id);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleMarkRead(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const result = await markNotificationReadAction(notification._id);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={(e) => e.key === "Enter" && select()}
      className={cn(
        "flex items-start gap-3 border-l-2 px-4 py-4 text-left transition-colors",
        isSelected ? "border-l-primary bg-primary/5" : "border-l-transparent hover:bg-muted/40",
      )}
    >
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${NOTIFICATION_PRIORITY_COLOR[notification.priority]}1A`, color: NOTIFICATION_PRIORITY_COLOR[notification.priority] }}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!notification.read && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
        {!notification.read && (
          <Button type="button" variant="ghost" size="icon-sm" disabled={isPending} onClick={handleMarkRead} title="Mark as read">
            <Check className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
