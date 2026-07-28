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

const DEFAULT_ICON_KEY = "__default__";

// Pre-built once at module load, not per-render — StatusBadge renders
// whichever of these elements matches, rather than dynamically resolving a
// component reference and rendering it fresh each time (React's compiler
// can't prove a dynamically-picked component's identity is stable across
// renders, even when the underlying lookup — a plain map — genuinely is;
// pre-building the elements themselves sidesteps that entirely, since
// nothing is created during render at all).
const STATUS_ICON_ELEMENTS: Record<string, React.ReactElement> = Object.fromEntries([
  ...Object.entries(STATUS_ICON_MAP).map(([key, Icon]) => [key, <Icon key={key} className="size-3.5" />]),
  [DEFAULT_ICON_KEY, <Circle key={DEFAULT_ICON_KEY} className="size-3.5" />],
]);

export function getStatusIconElement(name: string | null | undefined): React.ReactElement {
  if (!name || !STATUS_ICON_ELEMENTS[name]) return STATUS_ICON_ELEMENTS[DEFAULT_ICON_KEY];
  return STATUS_ICON_ELEMENTS[name];
}
