import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { rotateField, getByPath } from "@/lib/rotate-encrypted-field";

const OLD_KEY = Buffer.alloc(32, 1);
const NEW_KEY = Buffer.alloc(32, 2);

// A fresh, uniquely-named collection per test — avoids any cross-test
// interference from rotateField's collection-wide scan (no shared mutable
// fixture to accidentally pollute between tests).
async function freshCollection() {
  await connectDB();
  return mongoose.connection.collection(`test_rotate_encrypted_field_${Date.now()}_${Math.random().toString(36).slice(2)}`);
}

describe("lib/rotate-encrypted-field — getByPath", () => {
  it("reads a nested dot-path value", () => {
    expect(getByPath({ a: { b: "x" } }, "a.b")).toBe("x");
  });

  it("returns undefined for a missing nested key", () => {
    expect(getByPath({ a: { b: "x" } }, "a.c")).toBeUndefined();
    expect(getByPath({}, "a.b")).toBeUndefined();
  });
});

describe("lib/rotate-encrypted-field — rotateField", () => {
  it("dry run reports what it would do without writing anything", async () => {
    const collection = await freshCollection();
    const { insertedId } = await collection.insertOne({ secret: encryptSecret("hello", OLD_KEY) });

    const dryRun = await rotateField(collection, "secret", OLD_KEY, NEW_KEY, false);
    expect(dryRun.rotated).toBe(1);
    expect(dryRun.errors).toBe(0);

    const stillOldKey = await collection.findOne({ _id: insertedId });
    expect(decryptSecret(stillOldKey!.secret as string, OLD_KEY)).toBe("hello");
  });

  it("re-encrypts a top-level field from the old key to the new key", async () => {
    const collection = await freshCollection();
    const { insertedId } = await collection.insertOne({ secret: encryptSecret("hello", OLD_KEY) });

    const result = await rotateField(collection, "secret", OLD_KEY, NEW_KEY, true);
    expect(result.rotated).toBe(1);

    const after = await collection.findOne({ _id: insertedId });
    expect(decryptSecret(after!.secret as string, NEW_KEY)).toBe("hello");
    expect(() => decryptSecret(after!.secret as string, OLD_KEY)).toThrow();
  });

  it("re-encrypts a nested dot-path field", async () => {
    const collection = await freshCollection();
    const { insertedId } = await collection.insertOne({ nested: { secret: encryptSecret("nested-value", OLD_KEY) } });

    await rotateField(collection, "nested.secret", OLD_KEY, NEW_KEY, true);

    const after = await collection.findOne({ _id: insertedId });
    expect(decryptSecret(after!.nested.secret, NEW_KEY)).toBe("nested-value");
  });

  it("is idempotent — a re-run after a successful rotation reports 'already on new key', not an error, and doesn't corrupt the value", async () => {
    const collection = await freshCollection();
    const { insertedId } = await collection.insertOne({ secret: encryptSecret("already-rotated", OLD_KEY) });
    await rotateField(collection, "secret", OLD_KEY, NEW_KEY, true);

    const secondPass = await rotateField(collection, "secret", OLD_KEY, NEW_KEY, true);
    expect(secondPass.rotated).toBe(0);
    expect(secondPass.alreadyOnNewKey).toBe(1);
    expect(secondPass.errors).toBe(0);

    const after = await collection.findOne({ _id: insertedId });
    expect(decryptSecret(after!.secret as string, NEW_KEY)).toBe("already-rotated");
  });

  it("tolerates a legacy plaintext number when the option is set, and leaves it untouched", async () => {
    const collection = await freshCollection();
    const { insertedId } = await collection.insertOne({ salary: 50000 });

    const result = await rotateField(collection, "salary", OLD_KEY, NEW_KEY, true, { tolerateLegacyPlaintextNumber: true });
    expect(result.legacyPlaintextSkipped).toBe(1);
    expect(result.rotated).toBe(0);

    const after = await collection.findOne({ _id: insertedId });
    expect(after!.salary).toBe(50000);
  });

  it("reports (and does not modify) a value that decrypts with neither key", async () => {
    const collection = await freshCollection();
    const { insertedId } = await collection.insertOne({ secret: "not-real-ciphertext" });
    const errorMessages: string[] = [];

    const result = await rotateField(collection, "secret", OLD_KEY, NEW_KEY, true, undefined, (_docId, message) => errorMessages.push(message));
    expect(result.errors).toBe(1);
    expect(errorMessages).toHaveLength(1);

    const after = await collection.findOne({ _id: insertedId });
    expect(after!.secret).toBe("not-real-ciphertext");
  });

  it("skips a document where the target field is entirely unset", async () => {
    const collection = await freshCollection();
    await collection.insertOne({ unrelated: "field" });

    const result = await rotateField(collection, "secret", OLD_KEY, NEW_KEY, true);
    expect(result.rotated).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.alreadyOnNewKey).toBe(0);
    expect(result.legacyPlaintextSkipped).toBe(0);
  });
});
