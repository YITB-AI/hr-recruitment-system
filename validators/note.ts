import { z } from "zod";

export const createNoteSchema = z.object({
  applicantId: z.string().min(1),
  body: z.string().trim().min(1, "Note can't be empty").max(5000, "Note is too long"),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
