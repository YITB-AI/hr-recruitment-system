import type { JobPostingProvider, PublishResult } from "@/lib/job-posting/types";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";
import { buildJobUrl } from "@/lib/job-posting/job-url";

const GRAPH_API_VERSION = "v21.0";

// Genuinely achievable without any special partnership — a real Meta for
// Developers app + Page Access Token (OAuth), posting to the Page's own
// feed via Graph API. Meta's app review for pages_manage_posts requires
// business verification and can take real time; posting will fail with a
// clear permission error until that's approved, which is outside this
// codebase's control.
export const facebookProvider: JobPostingProvider = {
  platform: "facebook",

  async isConnected(companyId: string): Promise<boolean> {
    const config = await companyIntegrationConfigRepository.getResolvedFacebookConfig(companyId);
    return config !== null;
  },

  async publishJob(job, companyId): Promise<PublishResult> {
    const config = await companyIntegrationConfigRepository.getResolvedFacebookConfig(companyId);
    if (!config) {
      return { ok: false, error: "Facebook isn't connected — connect a Page in Settings > Integrations first." };
    }

    const jobUrl = buildJobUrl(job._id);
    const message = `We're hiring: ${job.title}${job.department ? ` (${job.department})` : ""} — ${jobUrl}`;

    try {
      const response = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, link: jobUrl, access_token: config.pageAccessToken }),
        },
      );
      const data = (await response.json()) as { id?: string; error?: { message?: string } };
      if (!response.ok || !data.id) {
        return { ok: false, error: data.error?.message || `Facebook responded with ${response.status}` };
      }
      return { ok: true, externalPostId: data.id, externalPostUrl: `https://www.facebook.com/${data.id}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Failed to reach Facebook" };
    }
  },
};
