import type { JobPostingProvider, PublishResult } from "@/lib/job-posting/types";
import { buildJobUrl } from "@/lib/job-posting/job-url";

// LinkedIn's real Job Postings API requires a Talent Solutions/Recruiter
// System Connect PARTNERSHIP — unavailable to a self-serve OAuth app
// regardless of how much code is written here, and LinkedIn's basic
// consumer OAuth scopes don't grant anything posting-adjacent without that
// partnership. No credentials are stored or requested for this provider at
// all; isConnected() is always true (there is nothing to "connect") and
// publishJob() always returns LinkedIn's public share/post-intent URL for
// the HR user to open and post manually themselves — this is never
// "posted automatically," and the UI must label it accordingly.
export const linkedinProvider: JobPostingProvider = {
  platform: "linkedin",

  async isConnected(): Promise<boolean> {
    return true;
  },

  async publishJob(job): Promise<PublishResult> {
    const jobUrl = buildJobUrl(job._id);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
    return {
      ok: false,
      error: "LinkedIn job posting requires a Talent Solutions partner integration, which isn't available to this app.",
      requiresManualAction: { label: "Open LinkedIn to Post", url: shareUrl },
    };
  },
};
