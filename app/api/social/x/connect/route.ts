import { randomUUID, randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { hasCompanyFeature } from "@/lib/auth/feature-access";
import { companyRepository } from "@/server/repositories/company.repository";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";

const STATE_COOKIE = "x_oauth_state";

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// X API v2 OAuth2 with PKCE, using the company's own developer app
// credentials (entered manually first — see updateXAppCredentialsAction).
// Whether the resulting access token's tier actually permits POST /2/tweets
// is something only the company can confirm on X's current pricing page.
export async function GET() {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");

  const company = await companyRepository.findById(actor.companyId);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!hasCompanyFeature(company, "socialJobPosting")) {
    return NextResponse.json({ error: "Social Job Posting is not enabled for your company." }, { status: 403 });
  }

  const credentials = await companyIntegrationConfigRepository.getXAppCredentials(actor.companyId);
  if (!credentials) {
    return NextResponse.json({ error: "Add your X API Key and Secret first, in Settings > Integrations." }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social/x/callback`;
  const nonce = randomUUID();
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ nonce, companyId: actor.companyId, codeVerifier }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", credentials.apiKey);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  authUrl.searchParams.set("state", nonce);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl.toString());
}
