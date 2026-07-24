import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/current-user";
import { getOutlookAuthUrl } from "@/lib/calendar/outlook";

const STATE_COOKIE = "outlook_cal_oauth_state";

export async function GET() {
  const actor = await getCurrentUser();
  const nonce = randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ nonce, userId: actor.id, companyId: actor.companyId }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(getOutlookAuthUrl(nonce));
}
