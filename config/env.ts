import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  // The base domain proxy.ts strips to resolve a company's subdomain (e.g.
  // "dax-hr.vercel.app" so "acme.dax-hr.vercel.app" resolves slug "acme").
  // Optional: local dev has no real subdomains, so DEV_TENANT_SLUG (read
  // directly in proxy.ts) stands in when this isn't set or doesn't match.
  ROOT_DOMAIN: z.string().optional(),
});

let cached: z.infer<typeof envSchema> | null = null;

// Validated lazily (on first DB connection) rather than at module load, so
// routes/pages that don't touch the database still work before .env.local is set up.
export function getEnv() {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    ROOT_DOMAIN: process.env.ROOT_DOMAIN,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Missing/invalid environment variables: ${missing}`);
  }

  cached = parsed.data;
  return cached;
}
