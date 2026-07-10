"use server";

import { revalidatePath } from "next/cache";
import { scheduleInterviewSchema } from "@/validators/interview";
import { scheduleInterview } from "@/features/interviews/services/interview.service";

export type ScheduleInterviewResult = { success: true } | { success: false; error: string };

export async function scheduleInterviewAction(
  input: unknown,
): Promise<ScheduleInterviewResult> {
  const parsed = scheduleInterviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await scheduleInterview(parsed.data);
    revalidatePath(`/applicants/${parsed.data.applicantId}`);
    revalidatePath("/interviews");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to schedule interview" };
  }
}
