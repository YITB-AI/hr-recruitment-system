import { z } from "zod";
import { AI_CALL_TYPES, AI_CALL_INTERVIEW_MODES } from "@/constants/ai-call";

export const requestAiCallSchema = z.object({
  applicantId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  callType: z.enum(AI_CALL_TYPES, { message: "Select a call type" }),
  // Kept as a plain optional string here, not z.coerce.number() — same
  // reasoning as interviewerNames below: a raw HTML number input's value is
  // a string, and coercing here would make an empty field coerce to 0
  // (Number("") === 0) and then fail a .positive() check, wrongly rejecting
  // "left blank". Parsed to a real number (or left undefined) in
  // ai-call.service.ts instead.
  salaryBudget: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "Enter a valid number")
    .optional()
    .or(z.literal("")),
  interviewMode: z.enum(AI_CALL_INTERVIEW_MODES, { message: "Select an interview type" }),
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
