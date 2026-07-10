import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { getCurrentUser } from "@/lib/current-user";
import { getUnreadCount, getRecentNotifications } from "@/features/notifications/services/notification.service";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(user.id),
    getRecentNotifications(user.id),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} unreadCount={unreadCount} notifications={recentNotifications} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
