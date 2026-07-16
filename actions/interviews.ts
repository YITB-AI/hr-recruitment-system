"use server";

import { revalidatePath } from "next/cache";
import { scheduleInterviewSchema, rescheduleInterviewSchema } from "@/validators/interview";
import { scheduleInterview, rescheduleInterview, deleteInterview } from "@/features/interviews/services/interview.service";

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

export async function rescheduleInterviewAction(
  input: unknown,
): Promise<ScheduleInterviewResult> {
  const parsed = rescheduleInterviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await rescheduleInterview(parsed.data);
    revalidatePath(`/applicants/${parsed.data.applicantId}`);
    revalidatePath("/interviews");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reschedule interview" };
  }
}

export async function deleteInterviewAction(interviewId: string): Promise<ScheduleInterviewResult> {
  try {
    await deleteInterview(interviewId);
    revalidatePath("/interviews");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete interview" };
  }
}
