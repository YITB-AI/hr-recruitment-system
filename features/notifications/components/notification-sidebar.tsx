import Link from "next/link";
import { Bell, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABELS, type NotificationType } from "@/constants/notification";
import { NOTIFICATION_TYPE_ICON } from "@/features/notifications/lib/notification-icons";

type NotificationSidebarProps = {
  activeType?: string;
  showUnreadOnly: boolean;
  totalCount: number;
  totalUnread: number;
  counts: Array<{ type: NotificationType; count: number; unread: number }>;
};

// Server Component — plain navigation links, no client state needed.
export function NotificationSidebar({ activeType, showUnreadOnly, totalCount, totalUnread, counts }: NotificationSidebarProps) {
  const countByType = new Map(counts.map((c) => [c.type, c]));

  return (
    <nav className="space-y-1">
      <SidebarLink href="/notifications" label="All Notifications" count={totalCount} icon={Inbox} active={!activeType && !showUnreadOnly} />
      <SidebarLink href="/notifications?unread=1" label="Unread" count={totalUnread} icon={Bell} active={showUnreadOnly} />
      {NOTIFICATION_TYPES.map((type) => (
        <SidebarLink
          key={type}
          href={`/notifications?type=${type}`}
          label={NOTIFICATION_TYPE_LABELS[type]}
          count={countByType.get(type)?.count ?? 0}
          icon={NOTIFICATION_TYPE_ICON[type]}
          active={activeType === type}
        />
      ))}
    </nav>
  );
}

function SidebarLink({
  href,
  label,
  count,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  count: number;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4" />
        {label}
      </span>
      {count > 0 && (
        <Badge variant={active ? "default" : "secondary"} className="h-5 min-w-5 justify-center rounded-full px-1 text-[11px]">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  );
}
