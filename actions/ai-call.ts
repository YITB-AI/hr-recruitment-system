"use server";

import { revalidatePath } from "next/cache";
import { requestAiCallSchema } from "@/validators/ai-call";
import { requestAiCall, type AiCallResult } from "@/features/applicants/services/ai-call.service";

export async function requestAiCallAction(input: unknown): Promise<AiCallResult> {
  const parsed = requestAiCallSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await requestAiCall(parsed.data);
    revalidatePath(`/applicants/${parsed.data.applicantId}`);
    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to request the AI call" };
  }
}
