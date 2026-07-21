"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markNotificationReadAction } from "@/actions/notifications";
import { NOTIFICATION_TYPE_ICON, NOTIFICATION_PRIORITY_COLOR } from "@/features/notifications/lib/notification-icons";
import { NOTIFICATION_TYPE_LABELS } from "@/constants/notification";
import type { NotificationDetail } from "@/features/notifications/services/notification.service";

export function NotificationDetailPanel({ detail }: { detail: NotificationDetail }) {
  const { notification, entityLink } = detail;
  const Icon = NOTIFICATION_TYPE_ICON[notification.type];
  const color = NOTIFICATION_PRIORITY_COLOR[notification.priority];
  const [isPending, startTransition] = useTransition();

  function handleMarkRead() {
    startTransition(async () => {
      const result = await markNotificationReadAction(notification._id);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          className="flex size-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1A`, color }}
        >
          <Icon className="size-7" />
        </span>
        <h3 className="text-base font-semibold">{notification.title}</h3>
        <p className="text-xs text-muted-foreground">
          {new Date(notification.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="space-y-1.5 border-t pt-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">DETAILS</p>
        <p className="text-sm">{notification.message}</p>
      </div>

      <div className="space-y-2 border-t pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Type</span>
          <Badge variant="outline">{NOTIFICATION_TYPE_LABELS[notification.type]}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Priority</span>
          <Badge className="border-0 capitalize" style={{ backgroundColor: `${color}1A`, color }}>
            {notification.priority}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={notification.read ? "outline" : "default"}>{notification.read ? "Read" : "Unread"}</Badge>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        {!notification.read && (
          <Button className="w-full" disabled={isPending} onClick={handleMarkRead}>
            <Check className="size-4" />
            Mark as Read
          </Button>
        )}
        {entityLink && (
          <Button variant="outline" className="w-full" nativeButton={false} render={<Link href={entityLink.href} />}>
            {entityLink.label}
          </Button>
        )}
      </div>
    </div>
  );
}
