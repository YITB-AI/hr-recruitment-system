import type { JobPostingProvider, PublishResult } from "@/lib/job-posting/types";
import { companyIntegrationConfigRepository } from "@/server/repositories/company-integration-config.repository";

// Indeed's real-time job-posting API is partner-gated the same way
// LinkedIn's is, but Indeed's organic/free XML job-feed mechanism needs no
// partnership at all — see app/api/job-feeds/[companySlug]/indeed.xml,
// which Indeed's own crawler polls once the company registers that URL in
// their Indeed employer account. This provider exists only to keep the
// shared JobPostingProvider interface uniform; there is no per-job
// "publish" action for Indeed, only the company-wide feedEnabled toggle.
export const indeedProvider: JobPostingProvider = {
  platform: "indeed",

  async isConnected(companyId: string): Promise<boolean> {
    const config = await companyIntegrationConfigRepository.get(companyId);
    return config.indeed.feedEnabled;
  },

  async publishJob(): Promise<PublishResult> {
    return {
      ok: false,
      error: "Indeed uses a pull-based XML feed, not a per-job publish action — enable the feed in Settings > Integrations and opt this job into it instead.",
    };
  },
};
