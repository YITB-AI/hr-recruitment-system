import { getValidAccessToken } from "./token-refresh.service";
import { checkGoogleFreeBusy, createGoogleEvent, deleteGoogleEvent } from "@/lib/calendar/google";
import { checkOutlookFreeBusy, createOutlookEvent, deleteOutlookEvent } from "@/lib/calendar/outlook";
import { CALENDAR_PROVIDERS, type CalendarProvider } from "@/models/CalendarConnection";
import { userRepository } from "@/server/repositories/user.repository";
import { logPlatformError } from "@/lib/platform-error";

export type CalendarEventRef = { userId: string; provider: CalendarProvider; externalEventId: string };

// Best-effort throughout this file — every function swallows per-connection
// errors internally (console.error only) rather than throwing, since a
// calendar API failure must never block or fail the underlying interview
// mutation, which stays the source of truth. Also reported to
// logPlatformError so a recurring per-tenant integration failure (e.g. an
// expired OAuth token) actually surfaces on the Global Super Admin's error
// dashboard instead of only ever existing in raw Vercel function logs.
async function reportCalendarError(action: string, userId: string, provider: CalendarProvider, error: unknown): Promise<void> {
  console.error(`Failed to ${action} for ${provider} user ${userId}:`, error);
  const user = await userRepository.findByIdUnscoped(userId).catch(() => null);
  await logPlatformError({
    source: "calendar.sync",
    error,
    companyId: user?.companyId ?? undefined,
    action,
    context: { userId, provider },
  });
}

/** Returns the subset of interviewerIds with a real calendar conflict at this time. Interviewers with no connected calendar are silently skipped, not treated as "no conflict" or an error. */
export async function checkConflicts(interviewerIds: string[], scheduledAt: Date, durationMinutes: number): Promise<string[]> {
  const end = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const conflicting = new Set<string>();

  for (const userId of interviewerIds) {
    for (const provider of CALENDAR_PROVIDERS) {
      const token = await getValidAccessToken(userId, provider);
      if (!token) continue;
      try {
        const hasConflict =
          provider === "google" ? await checkGoogleFreeBusy(token, scheduledAt, end) : await checkOutlookFreeBusy(token, scheduledAt, end);
        if (hasConflict) conflicting.add(userId);
      } catch (error) {
        await reportCalendarError("check calendar conflicts", userId, provider, error);
      }
    }
  }
  return [...conflicting];
}

export async function createCalendarEventsForInterview(input: {
  interviewerIds: string[];
  summary: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes: number;
}): Promise<CalendarEventRef[]> {
  const end = new Date(input.scheduledAt.getTime() + input.durationMinutes * 60_000);
  const created: CalendarEventRef[] = [];

  for (const userId of input.interviewerIds) {
    for (const provider of CALENDAR_PROVIDERS) {
      const token = await getValidAccessToken(userId, provider);
      if (!token) continue;
      try {
        const externalEventId =
          provider === "google"
            ? await createGoogleEvent(token, { summary: input.summary, description: input.description, start: input.scheduledAt, end })
            : await createOutlookEvent(token, { summary: input.summary, description: input.description, start: input.scheduledAt, end });
        created.push({ userId, provider, externalEventId });
      } catch (error) {
        await reportCalendarError("create a calendar event", userId, provider, error);
      }
    }
  }
  return created;
}

export async function deleteCalendarEventsForInterview(calendarEvents: CalendarEventRef[]): Promise<void> {
  for (const event of calendarEvents) {
    const token = await getValidAccessToken(event.userId, event.provider);
    if (!token) continue;
    try {
      if (event.provider === "google") await deleteGoogleEvent(token, event.externalEventId);
      else await deleteOutlookEvent(token, event.externalEventId);
    } catch (error) {
      await reportCalendarError("delete a calendar event", event.userId, event.provider, error);
    }
  }
}
