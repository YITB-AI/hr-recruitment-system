import { NotificationBell } from "@/components/layout/notification-bell";
import { getUnreadCount, getRecentNotifications } from "@/features/notifications/services/notification.service";

// Split out of AppShell so it can be wrapped in <Suspense> there — the
// notification bell is the only piece of the shell that ever needs a fresh
// DB read on every navigation (sidebar/topbar frame itself only needs the
// already-cached session user). Isolating it lets the rest of the shell
// paint immediately instead of waiting on these two queries.
export async function NotificationBellData({ userId }: { userId: string }) {
  const [unreadCount, recentNotifications] = await Promise.all([getUnreadCount(userId), getRecentNotifications(userId)]);
  return <NotificationBell count={unreadCount} notifications={recentNotifications} />;
}
