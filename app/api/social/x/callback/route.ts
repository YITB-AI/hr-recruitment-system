import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";

const STATE_COOKIE = "x_oauth_state";

export async function GET(request: Request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const rawState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !rawState) {
    return NextResponse.json({ error: "Missing or expired OAuth state — try connecting again." }, { status: 400 });
  }
  const { nonce, companyId, codeVerifier } = JSON.parse(rawState) as { nonce: string; companyId: string; codeVerifier: string };
  if (nonce !== state) {
    return NextResponse.json({ error: "OAuth state mismatch — try connecting again." }, { status: 400 });
  }

  const credentials = await companyIntegrationConfigRepository.getXAppCredentials(companyId);
  if (!credentials) {
    return NextResponse.json({ error: "X app credentials are no longer configured." }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social/x/callback`;

  try {
    const basicAuth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64");
    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: credentials.apiKey,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    const data = (await response.json()) as { access_token?: string; refresh_token?: string; error_description?: string };
    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description || "Failed to exchange authorization code");
    }

    // This provider's stored "accessTokenSecret" slot holds the OAuth2
    // refresh_token here (X's v2 API is OAuth2, not the older OAuth1.0a
    // token+secret pairing the field name suggests) — repurposed rather
    // than adding a new field for a provider that can't be tested end-to-
    // end without real credentials anyway.
    await companyIntegrationConfigRepository.saveXTokens(companyId, {
      accessToken: data.access_token,
      accessTokenSecret: data.refresh_token || "",
    });

    await activityLogRepository.create({
      companyId,
      actorName: "X OAuth",
      action: "integration_config.x_connected",
      entityType: "setting",
      entityId: companyId,
      message: "Connected X account",
    });

    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to connect X" }, { status: 500 });
  }
}
