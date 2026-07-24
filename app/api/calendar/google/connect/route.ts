import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/current-user";
import { getGoogleAuthUrl } from "@/lib/calendar/google";

const STATE_COOKIE = "google_cal_oauth_state";

// Self-service — connecting one's OWN calendar needs no requireRole gate,
// same reasoning as changing one's own password; available to every role.
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

  return NextResponse.redirect(getGoogleAuthUrl(nonce));
}
