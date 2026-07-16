"use server";

import { revalidatePath } from "next/cache";
import {
  shortlistApplicant,
  rejectApplicant,
  bulkChangeApplicantStatus,
  changeApplicantStatus,
} from "@/features/applicants/services/applicant.service";
import { sendApplicantEmail, sendApplicantSms } from "@/features/applicants/services/applicant-notification.service";
import { requestApplicationCreate } from "@/features/applicants/services/create-application.service";
import { createApplicationSchema } from "@/validators/create-application";
import type { ApplicantStatus } from "@/constants/applicant-status";

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

export async function updateApplicantStatusAction(applicantId: string, status: ApplicantStatus): Promise<ApplicantActionResult> {
  try {
    await changeApplicantStatus(applicantId, status);
    revalidatePath(`/applicants/${applicantId}`);
    revalidatePath("/applicants");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" };
  }
}

export type BulkActionResult = { successCount: number; failures: Array<{ id: string; error: string }> };

export async function bulkUpdateStatusAction(applicantIds: string[], status: ApplicantStatus): Promise<BulkActionResult> {
  try {
    const { successCount } = await bulkChangeApplicantStatus(applicantIds, status);
    revalidatePath("/applicants");
    return { successCount, failures: [] };
  } catch (error) {
    return {
      successCount: 0,
      failures: applicantIds.map((id) => ({ id, error: error instanceof Error ? error.message : "Failed to update status" })),
    };
  }
}

async function bulkNotify(
  applicantIds: string[],
  send: (id: string) => Promise<{ success: boolean; error?: string }>,
): Promise<BulkActionResult> {
  const results = await Promise.allSettled(applicantIds.map((id) => send(id)));

  let successCount = 0;
  const failures: Array<{ id: string; error: string }> = [];

  results.forEach((outcome, index) => {
    const id = applicantIds[index];
    if (outcome.status === "fulfilled" && outcome.value.success) {
      successCount++;
    } else {
      const error =
        outcome.status === "fulfilled" ? outcome.value.error ?? "Failed" : outcome.reason instanceof Error ? outcome.reason.message : "Failed";
      failures.push({ id, error });
    }
  });

  revalidatePath("/applicants");
  return { successCount, failures };
}

export async function bulkSendEmailAction(applicantIds: string[]): Promise<BulkActionResult> {
  return bulkNotify(applicantIds, sendApplicantEmail);
}

export async function bulkSendSmsAction(applicantIds: string[]): Promise<BulkActionResult> {
  return bulkNotify(applicantIds, sendApplicantSms);
}

export async function createApplicationAction(formData: FormData): Promise<ApplicantActionResult> {
  const parsed = createApplicationSchema.safeParse({ jobId: formData.get("jobId") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a CV file first" };
  }

  try {
    const result = await requestApplicationCreate(parsed.data.jobId, file);
    revalidatePath("/applicants");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to submit the application" };
  }
}
