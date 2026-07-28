import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Fixed-window rate limiting backed by MongoDB Atlas (the existing
// cluster) rather than a new external store (e.g. Upstash Redis) — a
// deliberate choice given Vercel serverless functions don't share memory
// across instances, so an in-process counter can't work. A TTL index on
// `expiresAt` lets MongoDB auto-delete expired buckets — no cron/cleanup
// job needed. See lib/rate-limit.ts for the actual algorithm.
const rateLimitBucketSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  windowStart: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});

rateLimitBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitBucketDoc = InferSchemaType<typeof rateLimitBucketSchema>;

export const RateLimitBucket: Model<RateLimitBucketDoc> =
  models.RateLimitBucket ?? model<RateLimitBucketDoc>("RateLimitBucket", rateLimitBucketSchema);
