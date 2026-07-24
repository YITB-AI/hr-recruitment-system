import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";

const STATE_COOKIE = "fb_oauth_state";
const GRAPH_API_VERSION = "v21.0";

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
  const { nonce, companyId } = JSON.parse(rawState) as { nonce: string; companyId: string };
  if (nonce !== state) {
    return NextResponse.json({ error: "OAuth state mismatch — try connecting again." }, { status: 400 });
  }

  const credentials = await companyIntegrationConfigRepository.getFacebookAppCredentials(companyId);
  if (!credentials) {
    return NextResponse.json({ error: "Facebook app credentials are no longer configured." }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/social/facebook/callback`;

  try {
    // 1. Exchange the auth code for a short-lived user access token.
    const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", credentials.appId);
    tokenUrl.searchParams.set("client_secret", credentials.appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: { message?: string } };
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message || "Failed to exchange authorization code");
    }

    // 2. Exchange for a long-lived user token (~60 days, refreshed on reconnect).
    const longLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", credentials.appId);
    longLivedUrl.searchParams.set("client_secret", credentials.appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", tokenData.access_token);
    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = (await longLivedResponse.json()) as { access_token?: string; expires_in?: number };
    const userToken = longLivedData.access_token || tokenData.access_token;

    // 3. List the Pages this user manages — Page access tokens derived from
    // a long-lived user token don't expire on their own. Picks the FIRST
    // returned page (a documented v1 simplification, not a picker UI).
    const pagesResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?access_token=${encodeURIComponent(userToken)}`,
    );
    const pagesData = (await pagesResponse.json()) as { data?: Array<{ id: string; access_token: string; name: string }> };
    const page = pagesData.data?.[0];
    if (!page) throw new Error("No Facebook Pages found for this account — you need to manage at least one Page.");

    await companyIntegrationConfigRepository.saveFacebookPageConnection(companyId, {
      pageId: page.id,
      pageAccessToken: page.access_token,
      tokenExpiresAt: longLivedData.expires_in ? new Date(Date.now() + longLivedData.expires_in * 1000) : undefined,
    });

    await activityLogRepository.create({
      companyId,
      actorName: "Facebook OAuth",
      action: "integration_config.facebook_connected",
      entityType: "setting",
      entityId: companyId,
      message: `Connected Facebook Page "${page.name}"`,
    });

    return NextResponse.redirect(`${baseUrl}/settings?tab=integrations`);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect Facebook" },
      { status: 500 },
    );
  }
}
