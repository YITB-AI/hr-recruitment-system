import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { companyRepository } from "@/server/repositories/company.repository";
import { hasCompanyFeature } from "@/lib/auth/feature-access";
import { getOutlookAuthUrl } from "@/lib/calendar/outlook";

const STATE_COOKIE = "outlook_cal_oauth_state";

// Gated on the company's Model Access grant — see google/connect's mirror
// of this same check for the full reasoning.
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

  return NextResponse.redirect(getOutlookAuthUrl(nonce));
}
