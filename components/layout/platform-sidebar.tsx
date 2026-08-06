"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, AlertTriangle, Users2, ShieldAlert, ShieldCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// A deliberately separate sidebar from components/layout/sidebar.tsx — this
// is the Global Super Admin workspace (app/(platform)/*), not a company's
// own tenant view, so it has its own nav, its own icon set, and never reuses
// config/nav.ts (that list is the per-company product surface).
//
// Grouped into labeled sections (matching the reference design) purely for
// scanability — every item here is a real, built page; no placeholder
// destinations (API Keys, Audit Logs, etc.) are added just to fill out a
// group, since none of those exist as real features yet.
const PLATFORM_NAV_GROUPS: Array<{ label: string | null; items: Array<{ href: string; label: string; icon: typeof LayoutDashboard }> }> = [
  { label: null, items: [{ href: "/platform/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Management",
    items: [
      { href: "/platform/companies", label: "Companies", icon: Building2 },
      { href: "/platform/roles", label: "Global Roles & RBAC", icon: ShieldCheck },
      { href: "/platform/settings", label: "Platform Settings", icon: Settings },
    ],
  },
  {
    label: "Data Quality",
    items: [
      { href: "/platform/unmapped-jobs", label: "Unmapped Jobs", icon: AlertTriangle },
      { href: "/platform/orphaned-applicants", label: "Orphaned Applicants", icon: Users2 },
    ],
  },
  { label: "Monitoring", items: [{ href: "/platform/error-logs", label: "System Error Logs", icon: ShieldAlert }] },
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

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {PLATFORM_NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`} className="space-y-1">
            {group.label && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/40">{group.label}</p>
            )}
            {group.items.map((item) => {
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
          </div>
        ))}
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
