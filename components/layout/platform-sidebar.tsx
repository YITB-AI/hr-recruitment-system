"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, AlertTriangle, Users2, ShieldAlert, ShieldCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// A deliberately separate sidebar from components/layout/sidebar.tsx — this
// is the Global Super Admin workspace (app/(platform)/*), not a company's
// own tenant view, so it has its own nav, its own icon set, and never reuses
// config/nav.ts (that list is the per-company product surface).
const PLATFORM_NAV_ITEMS = [
  { href: "/platform/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/companies", label: "Companies", icon: Building2 },
  { href: "/platform/roles", label: "Global Roles & RBAC", icon: ShieldCheck },
  { href: "/platform/unmapped-jobs", label: "Unmapped Jobs", icon: AlertTriangle },
  { href: "/platform/orphaned-applicants", label: "Orphaned Applicants", icon: Users2 },
  { href: "/platform/error-logs", label: "System Error Logs", icon: ShieldAlert },
  { href: "/platform/settings", label: "Platform Settings", icon: Settings },
];

export function PlatformSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldAlert className="size-5" />
        </div>
        <div className="truncate">
          <p className="truncate font-semibold text-sidebar-foreground">HR Platform</p>
          <p className="truncate text-xs text-sidebar-foreground/60">Global Admin Workspace</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {PLATFORM_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          Switch to Tenant View
        </Link>
      </div>
    </aside>
  );
}
