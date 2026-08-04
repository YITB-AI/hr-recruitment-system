import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { hasCompanyFeature } from "@/lib/auth/feature-access";
import { companyRepository } from "@/server/repositories/company.repository";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";

const STATE_COOKIE = "fb_oauth_state";

// Starts the Facebook Login for Business flow using the company's OWN Meta
// app credentials (entered manually in Settings > Integrations first — see
// updateFacebookAppCredentialsAction). Requires pages_manage_posts, which
// needs Meta App Review + Business Verification before it actually works
// live — this route only builds the authorize URL, it doesn't wait on that.
export async function GET() {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");

  const company = await companyRepository.findById(actor.companyId);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!hasCompanyFeature(company, "socialJobPosting")) {
    return NextResponse.json({ error: "Social Job Posting is not enabled for your company." }, { status: 403 });
  }

  const credentials = await companyIntegrationConfigRepository.getFacebookAppCredentials(actor.companyId);
  if (!credentials) {
    return NextResponse.json({ error: "Add your Facebook App ID and Secret first, in Settings > Integrations." }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social/facebook/callback`;
  const nonce = randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ nonce, companyId: actor.companyId }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", credentials.appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", nonce);
  authUrl.searchParams.set("scope", "pages_manage_posts,pages_read_engagement");

  return NextResponse.redirect(authUrl.toString());
}
