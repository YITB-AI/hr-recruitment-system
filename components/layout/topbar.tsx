"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ProfileMenu } from "@/components/layout/profile-menu";
import type { SessionUser } from "@/types/user";
import type { NotificationRow } from "@/server/repositories/notification.repository";

type TopbarProps = {
  user: SessionUser;
  unreadCount: number;
  notifications: NotificationRow[];
};

export function Topbar({ user, unreadCount, notifications }: TopbarProps) {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full md:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden rounded-full md:inline-flex"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="size-[18px]" />
      </Button>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-1 max-w-md items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="hidden rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell count={unreadCount} notifications={notifications} />
        <div className="mx-1 h-6 w-px bg-border" />
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
