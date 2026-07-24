import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { exchangeOutlookCode, getOutlookUserEmail } from "@/lib/calendar/outlook";
import { calendarConnectionRepository } from "@/server/repositories/calendar-connection.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";

const STATE_COOKIE = "outlook_cal_oauth_state";

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
    const tokens = await exchangeOutlookCode(code);
    if (!tokens.refresh_token) {
      throw new Error("Microsoft did not return a refresh token — make sure offline_access is granted and try again.");
    }
    const email = await getOutlookUserEmail(tokens.access_token);

    await calendarConnectionRepository.upsert({
      userId,
      companyId,
      provider: "outlook",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      providerAccountEmail: email ?? undefined,
    });

    await activityLogRepository.create({
      companyId,
      actorId: userId,
      action: "calendar.outlook_connected",
      entityType: "user",
      entityId: userId,
      message: `Connected Outlook Calendar${email ? ` (${email})` : ""}`,
    });

    return NextResponse.redirect(`${baseUrl}/profile?tab=calendar&connected=outlook`);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : "Failed to connect Outlook Calendar");
    return NextResponse.redirect(`${baseUrl}/profile?tab=calendar&error=${message}`);
  }
}
