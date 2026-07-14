import { z } from "zod";

export const requestAiCallSchema = z.object({
  applicantId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[+\d][\d\s\-()]{6,19}$/, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  jobTitle: z.string().optional().or(z.literal("")),
  callDate: z.string().min(1, "Call date is required"),
  callTime: z.string().min(1, "Call time is required"),
  message: z.string().min(1, "Message/prompt is required").max(2000, "Message is too long"),
});
export type RequestAiCallInput = z.infer<typeof requestAiCallSchema>;
