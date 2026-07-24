import type { JobPostingProvider, PublishResult } from "@/lib/job-posting/types";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";
import { buildJobUrl } from "@/lib/job-posting/job-url";

// Genuinely achievable without any special partnership — a real X developer
// app + OAuth2, POST /2/tweets. Whether the company's current API tier
// permits posting is something only they can confirm on X's current
// pricing page — this adapter targets the documented v2 tweet-creation
// endpoint but cannot itself guarantee tier eligibility.
export const xProvider: JobPostingProvider = {
  platform: "x",

  async isConnected(companyId: string): Promise<boolean> {
    const tokens = await companyIntegrationConfigRepository.getResolvedXTokens(companyId);
    return tokens !== null;
  },

  async publishJob(job, companyId): Promise<PublishResult> {
    const tokens = await companyIntegrationConfigRepository.getResolvedXTokens(companyId);
    if (!tokens) {
      return { ok: false, error: "X isn't connected — connect your account in Settings > Integrations first." };
    }

    const jobUrl = buildJobUrl(job._id);
    const text = `We're hiring: ${job.title}${job.department ? ` (${job.department})` : ""} — ${jobUrl}`;

    try {
      const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // X's v2 API uses the OAuth2 user-context access token as a
          // bearer token here — accessTokenSecret is retained for parity
          // with the stored-credential shape but isn't used by this
          // specific endpoint (OAuth2, not OAuth1.0a signing).
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as { data?: { id?: string }; detail?: string };
      if (!response.ok || !data.data?.id) {
        return { ok: false, error: data.detail || `X responded with ${response.status}` };
      }
      return { ok: true, externalPostId: data.data.id, externalPostUrl: `https://x.com/i/web/status/${data.data.id}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to reach X" };
    }
  },
};
