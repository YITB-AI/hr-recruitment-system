"use server";

import { revalidatePath } from "next/cache";
import { shortlistApplicant, rejectApplicant } from "@/features/applicants/services/applicant.service";

export type ApplicantActionResult = { success: true } | { success: false; error: string };

export async function shortlistApplicantAction(applicantId: string): Promise<ApplicantActionResult> {
  try {
    await shortlistApplicant(applicantId);
    revalidatePath(`/applicants/${applicantId}`);
    revalidatePath("/applicants");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to shortlist" };
  }
}

export async function rejectApplicantAction(applicantId: string): Promise<ApplicantActionResult> {
  try {
    await rejectApplicant(applicantId);
    revalidatePath(`/applicants/${applicantId}`);
    revalidatePath("/applicants");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reject" };
  }
}
