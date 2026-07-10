import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Briefcase,
  Users,
  CalendarClock,
  UserSquare2,
  FileText,
  LayoutTemplate,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Applicants", href: "/applicants", icon: Users },
  { label: "Interviews", href: "/interviews", icon: CalendarClock },
  { label: "Employees", href: "/employees", icon: UserSquare2 },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Templates", href: "/templates", icon: LayoutTemplate },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];
