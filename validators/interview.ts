import { z } from "zod";
import { INTERVIEW_TYPES } from "@/constants/interview";

export const scheduleInterviewSchema = z.object({
  applicantId: z.string().min(1),
  type: z.enum(INTERVIEW_TYPES),
  interviewerIds: z.array(z.string()).min(1, "Select at least one interviewer"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  durationMinutes: z.number().int().positive(),
  meetingLink: z.url({ message: "Enter a valid URL" }).optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;
