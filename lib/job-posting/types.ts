import type { JobPostingPlatform } from "@/constants/job";
import type { JobRow } from "@/server/repositories/job.repository";

export type PublishResult =
  | { ok: true; externalPostId?: string; externalPostUrl?: string }
  | { ok: false; error: string; requiresManualAction?: { label: string; url: string } };

export interface JobPostingProvider {
  readonly platform: JobPostingPlatform;
  /** Whether this company has valid, usable credentials/tokens stored for this platform. */
  isConnected(companyId: string): Promise<boolean>;
  /** Publishes (or attempts to publish) the given job. */
  publishJob(job: JobRow, companyId: string): Promise<PublishResult>;
}
