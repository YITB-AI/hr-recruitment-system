"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createJobSchema } from "@/validators/job";
import { createJob } from "@/features/jobs/services/job.service";

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
