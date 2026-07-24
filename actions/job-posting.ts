"use server";

import { revalidatePath } from "next/cache";
import { publishJobToPlatform, setPostToIndeed } from "@/features/jobs/services/job-posting.service";
import type { JobPostingPlatform } from "@/constants/job";
import type { PublishResult } from "@/lib/job-posting/types";

export type JobPostingActionResult = { success: true; result: PublishResult } | { success: false; error: string };

export async function publishJobToPlatformAction(jobId: string, platform: JobPostingPlatform): Promise<JobPostingActionResult> {
  try {
    const result = await publishJobToPlatform(jobId, platform);
    revalidatePath(`/jobs/${jobId}`);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to publish job" };
  }
}

export type SetPostToIndeedActionResult = { success: true } | { success: false; error: string };

export async function setPostToIndeedAction(jobId: string, postToIndeed: boolean): Promise<SetPostToIndeedActionResult> {
  try {
    await setPostToIndeed(jobId, postToIndeed);
    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update Indeed feed setting" };
  }
}
