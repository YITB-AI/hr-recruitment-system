import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { exchangeGoogleCode, getGoogleUserEmail } from "@/lib/calendar/google";
import { calendarConnectionRepository } from "@/server/repositories/calendar-connection.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";

const STATE_COOKIE = "google_cal_oauth_state";

export async function GET(request: Request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const cookieStore = await cookies();
  const rawState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !rawState) {
    return NextResponse.redirect(`${baseUrl}/profile?tab=calendar&error=state`);
  }
  const { nonce, userId, companyId } = JSON.parse(rawState) as { nonce: string; userId: string; companyId: string };
  if (nonce !== state) {
    return NextResponse.redirect(`${baseUrl}/profile?tab=calendar&error=state`);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Google did not return a refresh token — try disconnecting in your Google account settings and reconnecting.");
    }
    const email = await getGoogleUserEmail(tokens.access_token);

    await calendarConnectionRepository.upsert({
      userId,
      companyId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000),
      scope: tokens.scope ?? undefined,
      providerAccountEmail: email ?? undefined,
    });

    await activityLogRepository.create({
      companyId,
      actorId: userId,
      action: "calendar.google_connected",
      entityType: "user",
      entityId: userId,
      message: `Connected Google Calendar${email ? ` (${email})` : ""}`,
    });

    return NextResponse.redirect(`${baseUrl}/profile?tab=calendar&connected=google`);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : "Failed to connect Google Calendar");
    return NextResponse.redirect(`${baseUrl}/profile?tab=calendar&error=${message}`);
  }
}
