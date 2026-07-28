import mongoose, { type Mongoose } from "mongoose";
import { getEnv } from "@/config/env";

type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

// Cached on `global` so Next.js's dev-mode module reloading doesn't open a new
// connection pool on every request.
declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };
global.__mongooseCache = cache;

export async function connectDB(): Promise<Mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const { MONGODB_URI } = getEnv();
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Each warm serverless instance gets its OWN connection pool (this
      // cache is per-instance, not shared) — the driver's un-set default
      // (100) would let a burst of concurrent warm instances open enough
      // combined connections toward Atlas to exhaust a smaller cluster
      // tier under real multi-tenant load. 10 is the standard serverless-
      // tuned value for this exact pattern.
      maxPoolSize: 10,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
