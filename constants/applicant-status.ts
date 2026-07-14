import {
  Inbox,
  UserSearch,
  Sparkles,
  ListChecks,
  CalendarClock,
  CalendarCheck2,
  Star,
  Send,
  ThumbsUp,
  ThumbsDown,
  PauseCircle,
  XCircle,
  PhoneMissed,
  MailQuestion,
  Repeat,
  Clock3,
  Copy,
  LogOut,
  Ban,
  UserCheck,
  Archive,
  type LucideIcon,
} from "lucide-react";

// Existing keys (new/screening/shortlisted/interview/offer/hired/rejected/
// incomplete) are never renamed or removed — real applicant documents in
// production already store these exact string values. Every status added
// since is a genuinely new key, never a replacement for one of these.
export const APPLICANT_STATUSES = [
  "new",
  "applied",
  "screening",
  "ai_screening",
  "shortlisted",
  "interview",
  "interview_completed",
  "selected",
  "offer",
  "offer_accepted",
  "offer_declined",
  "hired",
  "on_hold",
  "not_interested",
  "not_available",
  "no_response",
  "followup_required",
  "future_opportunity",
  "duplicate",
  "withdrawn",
  "rejected",
  "incomplete",
  "archived",
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

// The Kanban board's columns — a curated subset of the full status list
// above, not all 23 (a 23-column board would be unusable). Statuses outside
// this list are still fully valid — reachable via the status dropdown on an
// applicant's own profile and via filters — just not drag-and-drop targets.
export const PIPELINE_STATUSES: ApplicantStatus[] = [
  "new",
  "screening",
  "shortlisted",
  "interview",
  "rejected",
  "incomplete",
];

export const APPLICANT_STATUS_CONFIG: Record<
  ApplicantStatus,
  { label: string; colorVar: string; badgeClassName: string; icon: LucideIcon }
> = {
  new: {
    label: "New",
    colorVar: "var(--status-new)",
    badgeClassName: "bg-[var(--status-new)]/10 text-[var(--status-new)]",
    icon: Inbox,
  },
  applied: {
    label: "Applied",
    colorVar: "var(--status-applied)",
    badgeClassName: "bg-[var(--status-applied)]/10 text-[var(--status-applied)]",
    icon: Send,
  },
  screening: {
    label: "Under Review",
    colorVar: "var(--status-screening)",
    badgeClassName: "bg-[var(--status-screening)]/10 text-[var(--status-screening)]",
    icon: UserSearch,
  },
  ai_screening: {
    label: "AI Screening",
    colorVar: "var(--status-ai-screening)",
    badgeClassName: "bg-[var(--status-ai-screening)]/10 text-[var(--status-ai-screening)]",
    icon: Sparkles,
  },
  shortlisted: {
    label: "Shortlisted",
    colorVar: "var(--status-shortlisted)",
    badgeClassName: "bg-[var(--status-shortlisted)]/10 text-[var(--status-shortlisted)]",
    icon: ListChecks,
  },
  interview: {
    label: "Interview Scheduled",
    colorVar: "var(--status-interview)",
    badgeClassName: "bg-[var(--status-interview)]/10 text-[var(--status-interview)]",
    icon: CalendarClock,
  },
  interview_completed: {
    label: "Interview Completed",
    colorVar: "var(--status-interview-completed)",
    badgeClassName: "bg-[var(--status-interview-completed)]/10 text-[var(--status-interview-completed)]",
    icon: CalendarCheck2,
  },
  selected: {
    label: "Selected",
    colorVar: "var(--status-selected)",
    badgeClassName: "bg-[var(--status-selected)]/10 text-[var(--status-selected)]",
    icon: Star,
  },
  offer: {
    label: "Offer Sent",
    colorVar: "var(--status-offer)",
    badgeClassName: "bg-[var(--status-offer)]/10 text-[var(--status-offer)]",
    icon: Send,
  },
  offer_accepted: {
    label: "Offer Accepted",
    colorVar: "var(--status-offer-accepted)",
    badgeClassName: "bg-[var(--status-offer-accepted)]/10 text-[var(--status-offer-accepted)]",
    icon: ThumbsUp,
  },
  offer_declined: {
    label: "Offer Declined",
    colorVar: "var(--status-offer-declined)",
    badgeClassName: "bg-[var(--status-offer-declined)]/10 text-[var(--status-offer-declined)]",
    icon: ThumbsDown,
  },
  hired: {
    label: "Hired",
    colorVar: "var(--status-hired)",
    badgeClassName: "bg-[var(--status-hired)]/10 text-[var(--status-hired)]",
    icon: UserCheck,
  },
  on_hold: {
    label: "On Hold",
    colorVar: "var(--status-on-hold)",
    badgeClassName: "bg-[var(--status-on-hold)]/10 text-[var(--status-on-hold)]",
    icon: PauseCircle,
  },
  not_interested: {
    label: "Not Interested",
    colorVar: "var(--status-not-interested)",
    badgeClassName: "bg-[var(--status-not-interested)]/10 text-[var(--status-not-interested)]",
    icon: XCircle,
  },
  not_available: {
    label: "Not Available",
    colorVar: "var(--status-not-available)",
    badgeClassName: "bg-[var(--status-not-available)]/10 text-[var(--status-not-available)]",
    icon: PhoneMissed,
  },
  no_response: {
    label: "No Response",
    colorVar: "var(--status-no-response)",
    badgeClassName: "bg-[var(--status-no-response)]/10 text-[var(--status-no-response)]",
    icon: MailQuestion,
  },
  followup_required: {
    label: "Follow-up Required",
    colorVar: "var(--status-followup-required)",
    badgeClassName: "bg-[var(--status-followup-required)]/10 text-[var(--status-followup-required)]",
    icon: Repeat,
  },
  future_opportunity: {
    label: "Future Opportunity",
    colorVar: "var(--status-future-opportunity)",
    badgeClassName: "bg-[var(--status-future-opportunity)]/10 text-[var(--status-future-opportunity)]",
    icon: Clock3,
  },
  duplicate: {
    label: "Duplicate Applicant",
    colorVar: "var(--status-duplicate)",
    badgeClassName: "bg-[var(--status-duplicate)]/10 text-[var(--status-duplicate)]",
    icon: Copy,
  },
  withdrawn: {
    label: "Withdrawn",
    colorVar: "var(--status-withdrawn)",
    badgeClassName: "bg-[var(--status-withdrawn)]/10 text-[var(--status-withdrawn)]",
    icon: LogOut,
  },
  rejected: {
    label: "Rejected",
    colorVar: "var(--status-rejected)",
    badgeClassName: "bg-[var(--status-rejected)]/10 text-[var(--status-rejected)]",
    icon: Ban,
  },
  incomplete: {
    label: "Incomplete",
    colorVar: "var(--status-incomplete)",
    badgeClassName: "bg-[var(--status-incomplete)]/10 text-[var(--status-incomplete)]",
    icon: Inbox,
  },
  archived: {
    label: "Archived",
    colorVar: "var(--status-archived)",
    badgeClassName: "bg-[var(--status-archived)]/10 text-[var(--status-archived)]",
    icon: Archive,
  },
};
