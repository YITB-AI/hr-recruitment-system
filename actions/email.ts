"use server";

import { revalidatePath } from "next/cache";
import { sendApplicantEmailSchema } from "@/validators/email";
import { sendApplicantEmail, type NotificationResult } from "@/features/applicants/services/applicant-notification.service";

export async function sendApplicantEmailAction(input: unknown): Promise<NotificationResult> {
  const parsed = sendApplicantEmailSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await sendApplicantEmail(parsed.data.applicantId, {
      template: parsed.data.template,
      interviewId: parsed.data.interviewId,
    });
    revalidatePath(`/applicants/${parsed.data.applicantId}`);
    revalidatePath("/interviews");
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
  }
}
