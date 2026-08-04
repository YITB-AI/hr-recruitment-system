import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { companyRepository } from "@/server/repositories/company.repository";
import { hasCompanyFeature } from "@/lib/auth/feature-access";
import { getGoogleAuthUrl } from "@/lib/calendar/google";

const STATE_COOKIE = "google_cal_oauth_state";

// Self-service — connecting one's OWN calendar needs no requireRole gate,
// same reasoning as changing one's own password; available to every role.
// Still gated on the company's Model Access grant, since Calendar
// Integration is a Global-Super-Admin-toggleable module regardless of role.
export async function GET() {
  await connectDB();
  const actor = await getCurrentUser();
  const company = await companyRepository.findById(actor.companyId);
  if (!company || !hasCompanyFeature(company, "calendarIntegration")) {
    return NextResponse.json({ error: "Calendar Integration is not enabled for your company." }, { status: 403 });
  }
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
