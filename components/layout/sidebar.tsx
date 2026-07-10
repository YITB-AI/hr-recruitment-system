"use client";

import { Users2 } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { NavList } from "@/components/layout/nav-list";

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar shrink-0 transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Users2 className="size-5" />
        </div>
        {!collapsed && (
          <span className="truncate font-semibold text-sidebar-foreground">HR Platform</span>
        )}
      </div>

      <NavList collapsed={collapsed} layoutId="sidebar-active-pill" />
    </aside>
  );
}
