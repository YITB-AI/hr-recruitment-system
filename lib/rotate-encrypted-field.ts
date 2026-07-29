import type { Collection } from "mongodb";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Core logic for scripts/rotate-config-encryption-key.ts, extracted into a
// plain lib module (rather than left inline in the script) specifically so
// it can be covered by the permanent test suite — scripts/ is excluded
// from next build's type-check pass and isn't a natural place to keep
// logic this important to get right.

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export type RotateFieldOptions = {
  /** Only Employee.basicSalary/grossSalary can legitimately still be a raw BSON number (a row the salary-encryption migration hasn't reached yet). */
  tolerateLegacyPlaintextNumber?: boolean;
};

export type RotateResult = { rotated: number; alreadyOnNewKey: number; legacyPlaintextSkipped: number; errors: number };

/**
 * Re-encrypts one dot-path field across every document in `collection`,
 * from `oldKey` to `newKey`. Idempotent — a value that fails to decrypt
 * with `oldKey` is checked against `newKey` before being treated as an
 * error, so re-running after a partial rotation never double-rotates or
 * corrupts an already-migrated document. Writes are gated by `confirm`;
 * with `confirm: false` this only reports what it WOULD do.
 */
export async function rotateField(
  collection: Collection,
  fieldPath: string,
  oldKey: Buffer,
  newKey: Buffer,
  confirm: boolean,
  options: RotateFieldOptions = {},
  onError?: (docId: unknown, message: string) => void,
): Promise<RotateResult> {
  const docs = await collection.find({}, { projection: { [fieldPath]: 1 } }).toArray();
  const result: RotateResult = { rotated: 0, alreadyOnNewKey: 0, legacyPlaintextSkipped: 0, errors: 0 };

  for (const doc of docs) {
    const raw = getByPath(doc, fieldPath);
    if (raw === undefined || raw === null) continue; // field genuinely unset for this document — nothing to rotate

    if (options.tolerateLegacyPlaintextNumber && typeof raw === "number") {
      result.legacyPlaintextSkipped++;
      continue;
    }

    if (typeof raw !== "string") {
      result.errors++;
      onError?.(doc._id, `${fieldPath} is neither ciphertext nor a tolerated legacy value`);
      continue;
    }

    let plaintext: string;
    try {
      plaintext = decryptSecret(raw, oldKey);
    } catch {
      try {
        decryptSecret(raw, newKey);
        result.alreadyOnNewKey++;
      } catch {
        result.errors++;
        onError?.(doc._id, `${fieldPath} does not decrypt with EITHER key`);
      }
      continue;
    }

    result.rotated++;
    if (confirm) {
      const newCiphertext = encryptSecret(plaintext, newKey);
      await collection.updateOne({ _id: doc._id }, { $set: { [fieldPath]: newCiphertext } });
    }
  }

  return result;
}
