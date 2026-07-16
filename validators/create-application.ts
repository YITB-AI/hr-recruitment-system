import { z } from "zod";

// jobId is the only client-trusted field — jobTitle/jobDescription always
// come from a server-side, tenant-scoped DB lookup (see
// create-application.service.ts), never from client input. The CV file
// itself is validated separately (File instance, MIME type, size) since zod
// doesn't model FormData File entries well.
export const createApplicationSchema = z.object({
  jobId: z.string().min(1, "Select a job"),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
