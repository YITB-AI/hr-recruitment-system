"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createJobSchema, updateJobSchema } from "@/validators/job";
import { createJob, updateJob, archiveJob, restoreJob, deleteJob } from "@/features/jobs/services/job.service";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createJobAction(input: unknown): Promise<ActionResult> {
  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await createJob(parsed.data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create job" };
  }

  revalidatePath("/jobs");
  redirect("/jobs");
}

export async function updateJobAction(input: unknown): Promise<ActionResult> {
  const parsed = updateJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateJob(parsed.data);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update job" };
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  redirect(`/jobs/${parsed.data.jobId}`);
}

export async function archiveJobAction(jobId: string): Promise<ActionResult> {
  try {
    await archiveJob(jobId);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to archive job" };
  }
}

export async function restoreJobAction(jobId: string): Promise<ActionResult> {
  try {
    await restoreJob(jobId);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to restore job" };
  }
}

export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  try {
    await deleteJob(jobId);
    revalidatePath("/jobs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete job" };
  }
}
