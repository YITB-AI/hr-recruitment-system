import { calendarConnectionRepository, type ResolvedCalendarTokens } from "@/server/repositories/calendar-connection.repository";
import { refreshGoogleToken } from "@/lib/calendar/google";
import { refreshOutlookToken } from "@/lib/calendar/outlook";
import type { CalendarProvider } from "@/models/CalendarConnection";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

// Never throws — a broken connection (revoked grant, expired refresh
// token, etc.) must never fail the surrounding interview-scheduling flow.
// Callers treat a null return as "skip this interviewer's calendar for
// this operation," not a hard failure.
export async function getValidAccessToken(userId: string, provider: CalendarProvider): Promise<string | null> {
  const tokens = await calendarConnectionRepository.getResolvedTokens(userId, provider);
  if (!tokens) return null;

  const needsRefresh = tokens.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;
  if (!needsRefresh) return tokens.accessToken;

  try {
    return await refreshAndPersist(tokens, provider);
  } catch (error) {
    await calendarConnectionRepository.setLastError(
      tokens._id,
      error instanceof Error ? error.message : "Token refresh failed — reconnect this calendar.",
    );
    return null;
  }
}

async function refreshAndPersist(tokens: ResolvedCalendarTokens, provider: CalendarProvider): Promise<string> {
  if (provider === "google") {
    const refreshed = await refreshGoogleToken(tokens.refreshToken);
    if (!refreshed.access_token) throw new Error("Google did not return a new access token");
    await calendarConnectionRepository.updateTokens(tokens._id, {
      accessToken: refreshed.access_token,
      tokenExpiresAt: refreshed.expiry_date ? new Date(refreshed.expiry_date) : new Date(Date.now() + 3600_000),
    });
    return refreshed.access_token;
  }

  const refreshed = await refreshOutlookToken(tokens.refreshToken);
  await calendarConnectionRepository.updateTokens(tokens._id, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
  });
  return refreshed.access_token;
}
