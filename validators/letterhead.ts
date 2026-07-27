import { z } from "zod";

export const createLetterheadSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
export type CreateLetterheadInput = z.infer<typeof createLetterheadSchema>;

// Bounded to a sane range (0-4in) — large enough to clear an unusually tall
// letterhead header/footer band, too small to let a typo swallow the whole
// page.
export const updateLetterheadMarginsSchema = z.object({
  contentTopMarginIn: z.number().min(0).max(4),
  contentBottomMarginIn: z.number().min(0).max(4),
});
export type UpdateLetterheadMarginsInput = z.infer<typeof updateLetterheadMarginsSchema>;
