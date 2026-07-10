import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
});

let cached: z.infer<typeof envSchema> | null = null;

// Validated lazily (on first DB connection) rather than at module load, so
// routes/pages that don't touch the database still work before .env.local is set up.
export function getEnv() {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Missing/invalid environment variables: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
