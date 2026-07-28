import { MongoMemoryServer } from "mongodb-memory-server";

// Runs once before the whole test run, in Vitest's main process — env vars
// set here are inherited by every test-file worker (Vitest's documented
// contract for globalSetup, the standard pattern for "start a test
// database once, share its connection string"). This means CI needs zero
// real secrets: no Atlas connection, no CONFIG_ENCRYPTION_KEY from a real
// deployment — everything here is synthetic and thrown away after the run.
let mongod: MongoMemoryServer | undefined;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("vitest-test-db");
  // A valid-shaped (32-byte, base64) key with no relationship to any real
  // deployment's key — lib/crypto.ts validates the shape but the value
  // itself only ever needs to be internally consistent within a test run.
  process.env.CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
}

export async function teardown() {
  await mongod?.stop();
}
