import { connectDB } from "@/server/db/connect";
import { RateLimitBucket } from "@/models";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the current window ends — 0 when allowed. */
  retryAfterMs: number;
};

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
}

// Fixed-window counter backed by MongoDB (see models/RateLimitBucket.ts for
// why Mongo rather than a new external store). Each window gets its own
// document (key embeds the window's start time), so there's nothing to
// reset — an expired window's document is simply a different key, and
// MongoDB's TTL index deletes old ones automatically.
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  await connectDB();

  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
  const bucketKey = `${key}:${windowStart.getTime()}`;

  let bucket;
  try {
    bucket = await RateLimitBucket.findOneAndUpdate(
      { key: bucketKey },
      { $inc: { count: 1 }, $setOnInsert: { windowStart, expiresAt } },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    // Two concurrent requests racing to create the SAME not-yet-existing
    // window's bucket can hit the unique index as a duplicate-key error on
    // the losing upsert — the document now exists either way, so a plain
    // (non-upsert) update always succeeds on retry.
    if (!isDuplicateKeyError(error)) throw error;
    bucket = await RateLimitBucket.findOneAndUpdate({ key: bucketKey }, { $inc: { count: 1 } }, { returnDocument: "after" });
  }

  const count = bucket?.count ?? 1;
  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterMs: allowed ? 0 : expiresAt.getTime() - now,
  };
}
