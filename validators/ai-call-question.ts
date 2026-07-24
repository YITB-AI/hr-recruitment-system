import { z } from "zod";

export const createAiCallQuestionSchema = z.object({
  text: z.string().min(1, "Question text is required").max(500, "Question is too long"),
});
export type CreateAiCallQuestionInput = z.infer<typeof createAiCallQuestionSchema>;

export const updateAiCallQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, "Question text is required").max(500, "Question is too long"),
});
export type UpdateAiCallQuestionInput = z.infer<typeof updateAiCallQuestionSchema>;

export const reorderAiCallQuestionsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderAiCallQuestionsInput = z.infer<typeof reorderAiCallQuestionsSchema>;
