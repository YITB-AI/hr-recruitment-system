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
  // Comma-separated in the form/schema; split into a real string[] in
  // ai-call.service.ts (kept out of the schema itself, since a .transform()
  // here would make the resolver's output type diverge from useForm's input
  // type in ai-call-dialog.tsx — react-hook-form/zodResolver don't like that).
  interviewerNames: z.string().min(1, "At least one interviewer name is required"),
  meetingLink: z.url({ message: "Enter a valid URL" }).optional().or(z.literal("")),
});
export type RequestAiCallInput = z.infer<typeof requestAiCallSchema>;
