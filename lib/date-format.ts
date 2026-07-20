import { DATE_FORMAT_OPTIONS } from "@/constants/appearance";

// Reuses the exact token set the company-wide Setting.dateFormat dropdown
// already offers (constants/appearance.ts) — that setting has been
// persisted end-to-end since the Settings page was built, but nothing ever
// actually applied it to a rendered date until this file. "long" is added
// as one more preset matching the pre-existing hardcoded
// formatMilestoneDate output, so passing no preset anywhere keeps
// behaving exactly as it did before this capability existed.
export const TEMPLATE_DATE_FORMAT_PRESETS = [...DATE_FORMAT_OPTIONS, "long"] as const;
export type TemplateDateFormatPreset = (typeof TEMPLATE_DATE_FORMAT_PRESETS)[number];

export const TIME_FORMAT_PRESETS = ["h:mm A", "HH:mm"] as const;
export type TimeFormatPreset = (typeof TIME_FORMAT_PRESETS)[number];

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// No date library in this codebase (every existing call site hand-rolls
// Intl/toLocaleDateString options — see the comment trail in
// lib/employee-milestones.ts) — this follows the same convention rather
// than introducing date-fns/dayjs for four fixed token patterns.
export function formatDateWithPreset(date: Date, preset?: string): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  switch (preset) {
    case "DD/MM/YYYY":
      return `${pad2(day)}/${pad2(month)}/${year}`;
    case "MM/DD/YYYY":
      return `${pad2(month)}/${pad2(day)}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${pad2(month)}-${pad2(day)}`;
    case "MMM D, YYYY":
      return `${MONTH_ABBR[month - 1]} ${day}, ${year}`;
    case "long":
    default:
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
}

// "now" as wall-clock date/time in a given IANA timezone — needed because
// formatDateWithPreset/formatTimeWithPreset read a Date object's LOCAL
// getters (getDate/getHours/etc), and the server's own local timezone on
// Vercel is UTC, not the company's configured Setting.timezone. Without
// this, `{{current_date}}` was computed in UTC: for a company in
// Asia/Karachi (UTC+5), any document generated between 7pm-midnight UTC
// (already past midnight, i.e. "tomorrow", in Karachi) would render
// yesterday's date. Builds a Date via the local constructor using the
// target timezone's actual wall-clock numbers, so the existing local
// getters "just work" against it regardless of the server's own timezone.
export function nowInTimeZone(timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const byType: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") byType[part.type] = part.value;
  }

  return new Date(
    Number(byType.year),
    Number(byType.month) - 1,
    Number(byType.day),
    Number(byType.hour) % 24, // some engines report "24" for midnight with hour12:false
    Number(byType.minute),
    Number(byType.second),
  );
}

export function formatTimeWithPreset(date: Date, preset?: string): string {
  const hours24 = date.getHours();
  const minutes = pad2(date.getMinutes());
  if (preset === "HH:mm") return `${pad2(hours24)}:${minutes}`;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const ampm = hours24 < 12 ? "AM" : "PM";
  return `${hours12}:${minutes} ${ampm}`;
}

// A raw value typed into (or auto-filled for) a "date"-type template field
// is either an ISO-ish string from an <input type="date"> or, occasionally,
// free text someone typed into a date field that isn't really a date —
// only reformat when it genuinely parses, otherwise pass it through
// unchanged rather than mangling it.
export function formatProvidedDateValue(raw: string, dateFormat?: string, timeFormat?: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const datePart = formatDateWithPreset(parsed, dateFormat);
  return timeFormat ? `${datePart} ${formatTimeWithPreset(parsed, timeFormat)}` : datePart;
}
