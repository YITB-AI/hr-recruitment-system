import type { JobPostingPlatform } from "@/constants/job";
import type { JobPostingProvider } from "@/lib/job-posting/types";
import { linkedinProvider } from "./linkedin.provider";
import { indeedProvider } from "./indeed.provider";
import { facebookProvider } from "./facebook.provider";
import { xProvider } from "./x.provider";

const PROVIDERS: Record<JobPostingPlatform, JobPostingProvider> = {
  linkedin: linkedinProvider,
  indeed: indeedProvider,
  facebook: facebookProvider,
  x: xProvider,
};

export function getJobPostingProvider(platform: JobPostingPlatform): JobPostingProvider {
  return PROVIDERS[platform];
}
