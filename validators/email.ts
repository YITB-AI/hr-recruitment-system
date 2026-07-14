import { z } from "zod";
import { EMAIL_TEMPLATES } from "@/constants/email";

export const sendApplicantEmailSchema = z.object({
  applicantId: z.string().min(1),
  template: z.enum(EMAIL_TEMPLATES),
  interviewId: z.string().optional(),
});
export type SendApplicantEmailInput = z.infer<typeof sendApplicantEmailSchema>;
