import { NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";

export const dynamic = "force-dynamic";

// Public, unauthenticated — an uptime monitor (Checkly/BetterStack/UptimeRobot)
// hits this to confirm MongoDB Atlas is actually reachable and the always-
// required secrets are present, independent of whether any particular page
// happens to render. Deliberately reports only booleans/latency, never a
// value or a stack trace, per SECURITY_STANDARDS.md's "never expose internal
// implementation details" — a monitor needs "is it broken", not "why".
export async function GET() {
  const start = Date.now();
  const requiredEnvVars = ["MONGODB_URI", "CONFIG_ENCRYPTION_KEY", "BLOB_READ_WRITE_TOKEN"] as const;
  const env = Object.fromEntries(requiredEnvVars.map((key) => [key, Boolean(process.env[key])]));
  const missingEnvVars = requiredEnvVars.filter((key) => !env[key]);

  let database: "connected" | "unreachable" = "unreachable";
  try {
    const mongoose = await connectDB();
    await mongoose.connection.db?.admin().ping();
    database = "connected";
  } catch {
    database = "unreachable";
  }

  const healthy = database === "connected" && missingEnvVars.length === 0;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      database,
      env,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
