import { calendar as calendarClient } from "@googleapis/calendar";
// Imported from googleapis-common (not the top-level google-auth-library
// package) so it's the EXACT same class @googleapis/calendar's own factory
// expects — a separately-installed top-level google-auth-library produces
// a structurally-incompatible duplicate class (TypeScript's private-field
// branding treats them as different types even though they're nominally
// identical), confirmed directly via a real build failure.
import { OAuth2Client } from "googleapis-common";

// The one deliberate exception to this codebase's usual "avoid heavy SDKs"
// bias — Calendar v3's freebusy/events/token-refresh surface is genuinely
// more complex than a couple of REST calls, unlike Outlook's client below.
// Uses @googleapis/calendar + google-auth-library (Calendar-API-only
// packages) rather than the full `googleapis` umbrella package — that
// package bundles type definitions for every Google API and blew out
// TypeScript's memory during this project's own production build
// ("JavaScript heap out of memory"), confirmed directly.
function getOAuthClient() {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return new OAuth2Client(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${baseUrl}/api/calendar/google/callback`,
  );
}

export function getGoogleAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    // Forces a refresh token even on a reconnect, not just the first-ever
    // consent — without this Google only issues one on the very first
    // authorization for an account.
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/userinfo.email"],
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function refreshGoogleToken(refreshToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

// Plain REST call rather than pulling in an @googleapis/oauth2 sub-package
// just for one field — same "don't add a dependency for a couple of REST
// calls" reasoning as the Outlook client below.
export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { email?: string };
  return data.email ?? null;
}

function getCalendarClient(accessToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  return calendarClient({ version: "v3", auth: client });
}

export async function checkGoogleFreeBusy(accessToken: string, timeMin: Date, timeMax: Date): Promise<boolean> {
  const calendar = getCalendarClient(accessToken);
  const { data } = await calendar.freebusy.query({
    requestBody: { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: "primary" }] },
  });
  const busy = data.calendars?.primary?.busy ?? [];
  return busy.length > 0;
}

export async function createGoogleEvent(
  accessToken: string,
  input: { summary: string; description?: string; start: Date; end: Date },
): Promise<string> {
  const calendar = getCalendarClient(accessToken);
  const { data } = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString() },
      end: { dateTime: input.end.toISOString() },
    },
  });
  if (!data.id) throw new Error("Google Calendar did not return an event id");
  return data.id;
}

export async function deleteGoogleEvent(accessToken: string, eventId: string): Promise<void> {
  const calendar = getCalendarClient(accessToken);
  await calendar.events.delete({ calendarId: "primary", eventId });
}
