"use server";

import { revalidatePath } from "next/cache";
import { createAiCallQuestionSchema, updateAiCallQuestionSchema, reorderAiCallQuestionsSchema } from "@/validators/ai-call-question";
import {
  createAiCallQuestion,
  updateAiCallQuestion,
  setAiCallQuestionActive,
  deleteAiCallQuestion,
  reorderAiCallQuestions,
} from "@/features/settings/services/ai-call-question.service";

export type AiCallQuestionActionResult = { success: true } | { success: false; error: string };

export async function createAiCallQuestionAction(input: unknown): Promise<AiCallQuestionActionResult> {
  const parsed = createAiCallQuestionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await createAiCallQuestion(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add question" };
  }
}

export async function updateAiCallQuestionAction(input: unknown): Promise<AiCallQuestionActionResult> {
  const parsed = updateAiCallQuestionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await updateAiCallQuestion(parsed.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update question" };
  }
}

export async function setAiCallQuestionActiveAction(id: string, isActive: boolean): Promise<AiCallQuestionActionResult> {
  try {
    await setAiCallQuestionActive(id, isActive);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update question" };
  }
}

export async function deleteAiCallQuestionAction(id: string): Promise<AiCallQuestionActionResult> {
  try {
    await deleteAiCallQuestion(id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete question" };
  }
}

export async function reorderAiCallQuestionsAction(input: unknown): Promise<AiCallQuestionActionResult> {
  const parsed = reorderAiCallQuestionsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await reorderAiCallQuestions(parsed.data.orderedIds);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reorder questions" };
  }
}
