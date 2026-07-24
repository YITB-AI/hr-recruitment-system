// Raw fetch against Microsoft's OAuth + Graph REST endpoints — no SDK
// dependency (matches this codebase's existing choice to skip a full SDK
// for Blob storage); a handful of direct REST calls doesn't justify
// @azure/msal-node's or @microsoft/microsoft-graph-client's abstraction
// weight.
const TENANT = process.env.MICROSOFT_TENANT_ID || "common";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function redirectUri(): string {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/api/calendar/outlook/callback`;
}

export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: "offline_access Calendars.ReadWrite User.Read",
    state,
  });
  return `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?${params.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const data = (await response.json()) as TokenResponse & { error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Failed to obtain a Microsoft token");
  return data;
}

export function exchangeOutlookCode(code: string): Promise<TokenResponse> {
  return requestToken({
    client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID || "",
    client_secret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || "",
    code,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
}

export function refreshOutlookToken(refreshToken: string): Promise<TokenResponse> {
  return requestToken({
    client_id: process.env.MICROSOFT_CALENDAR_CLIENT_ID || "",
    client_secret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

async function graphFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init?.headers },
  });
}

export async function getOutlookUserEmail(accessToken: string): Promise<string | null> {
  const response = await graphFetch(accessToken, "/me?$select=mail,userPrincipalName");
  if (!response.ok) return null;
  const data = (await response.json()) as { mail?: string; userPrincipalName?: string };
  return data.mail || data.userPrincipalName || null;
}

export async function checkOutlookFreeBusy(accessToken: string, timeMin: Date, timeMax: Date): Promise<boolean> {
  const meResponse = await graphFetch(accessToken, "/me?$select=mail,userPrincipalName");
  const me = (await meResponse.json()) as { mail?: string; userPrincipalName?: string };
  const address = me.mail || me.userPrincipalName;
  if (!address) return false;

  const response = await graphFetch(accessToken, "/me/calendar/getSchedule", {
    method: "POST",
    body: JSON.stringify({
      schedules: [address],
      startTime: { dateTime: timeMin.toISOString(), timeZone: "UTC" },
      endTime: { dateTime: timeMax.toISOString(), timeZone: "UTC" },
      availabilityViewInterval: 30,
    }),
  });
  if (!response.ok) return false;
  const data = (await response.json()) as { value?: Array<{ scheduleItems?: unknown[] }> };
  return Boolean(data.value?.[0]?.scheduleItems?.length);
}

export async function createOutlookEvent(
  accessToken: string,
  input: { summary: string; description?: string; start: Date; end: Date },
): Promise<string> {
  const response = await graphFetch(accessToken, "/me/events", {
    method: "POST",
    body: JSON.stringify({
      subject: input.summary,
      body: { contentType: "text", content: input.description || "" },
      start: { dateTime: input.start.toISOString(), timeZone: "UTC" },
      end: { dateTime: input.end.toISOString(), timeZone: "UTC" },
    }),
  });
  const data = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) throw new Error(data.error?.message || "Failed to create the Outlook event");
  return data.id;
}

export async function deleteOutlookEvent(accessToken: string, eventId: string): Promise<void> {
  await graphFetch(accessToken, `/me/events/${eventId}`, { method: "DELETE" });
}
