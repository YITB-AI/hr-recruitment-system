import {
  Inbox,
  Send,
  UserSearch,
  Sparkles,
  ListChecks,
  CalendarClock,
  CalendarCheck2,
  Star,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  PauseCircle,
  XCircle,
  PhoneMissed,
  MailQuestion,
  Repeat,
  Clock3,
  Copy,
  LogOut,
  Ban,
  Archive,
  Circle,
  type LucideIcon,
} from "lucide-react";

// Maps the icon NAME stored on a Status document (see the DEFAULT_SEEDS in
// server/repositories/status.repository.ts) to the actual component. New
// statuses an admin creates through Settings > Statuses have no icon set —
// they fall back to Circle, same as any legacy/unrecognized name.
export const STATUS_ICON_MAP: Record<string, LucideIcon> = {
  Inbox,
  Send,
  UserSearch,
  Sparkles,
  ListChecks,
  CalendarClock,
  CalendarCheck2,
  Star,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  PauseCircle,
  XCircle,
  PhoneMissed,
  MailQuestion,
  Repeat,
  Clock3,
  Copy,
  LogOut,
  Ban,
  Archive,
};

export function getStatusIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Circle;
  return STATUS_ICON_MAP[name] ?? Circle;
}
