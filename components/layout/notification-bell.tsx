"use client";

import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { NotificationRow } from "@/server/repositories/notification.repository";

type NotificationBellProps = {
  count?: number;
  notifications: NotificationRow[];
};

export function NotificationBell({ count = 0, notifications }: NotificationBellProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="relative rounded-full" />}
      >
        <Bell className="size-[18px]" />
        {count > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground/70">
              New activity will show up here in real time.
            </p>
          </div>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {notifications.map((n) => (
              <li key={n._id} className="flex items-start gap-2 px-4 py-3">
                {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                <div className={n.read ? "pl-3.5" : undefined}>
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
