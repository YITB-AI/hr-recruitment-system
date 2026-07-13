import { z } from "zod";
import { GENERATED_DOCUMENT_STATUSES } from "@/models";

export const documentStatusTransitionSchema = z.object({
  status: z.enum(GENERATED_DOCUMENT_STATUSES),
});
