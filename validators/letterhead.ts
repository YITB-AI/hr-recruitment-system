import { z } from "zod";

export const createLetterheadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
export type CreateLetterheadInput = z.infer<typeof createLetterheadSchema>;
