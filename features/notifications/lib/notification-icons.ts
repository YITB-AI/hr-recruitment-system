import { UserPlus, CalendarClock, Users, FileText, Settings, AtSign, type LucideIcon } from "lucide-react";
import type { NotificationType, NotificationPriority } from "@/constants/notification";

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, LucideIcon> = {
  application: UserPlus,
  interview: CalendarClock,
  employee: Users,
  document: FileText,
  system: Settings,
  mention: AtSign,
};

export const NOTIFICATION_TYPE_COLOR: Record<NotificationType, string> = {
  application: "#7c3aed",
  interview: "#2563eb",
  employee: "#ea580c",
  document: "#0891b2",
  system: "#71717a",
  mention: "#db2777",
};

export const NOTIFICATION_PRIORITY_COLOR: Record<NotificationPriority, string> = {
  low: "#71717a",
  normal: "#2563eb",
  high: "#ea580c",
  urgent: "#dc2626",
};
