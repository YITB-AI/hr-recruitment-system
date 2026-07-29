import crypto from "node:crypto";

// AES-256-GCM field-level encryption for secrets stored in
// CompanyIntegrationConfig (n8n API credentials, SMTP passwords, social
// media OAuth client secrets/tokens), CalendarConnection (OAuth access/
// refresh tokens), User.mfaSecretEncrypted, and Employee.basicSalary/
// grossSalary — the first field-level encryption capability in this
// codebase (SECURITY_STANDARDS.md's "Encryption for sensitive fields"
// mandate). Key rotation tool: scripts/rotate-config-encryption-key.ts.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV, GCM's recommended size
const KEY_LENGTH = 32; // AES-256

let cachedKey: Buffer | null = null;

/**
 * Validates a base64-encoded key the same way `loadKey` does below —
 * exported so scripts/rotate-config-encryption-key.ts can validate a
 * candidate NEW key with the identical rule, without duplicating it.
 */
export function parseEncryptionKey(base64: string, envVarName = "CONFIG_ENCRYPTION_KEY"): Buffer {
  const key = Buffer.from(base64, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(`${envVarName} must decode to exactly ${KEY_LENGTH} bytes (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`);
  }
  return key;
}

// Validated lazily on first actual use, not at module load — ES module
// imports are hoisted and evaluated before any of an importing script's own
// top-level code (confirmed directly: a script that calls dotenv's config()
// before its own `import ... from "@/lib/crypto"` still has this module's
// body run first, with env vars not yet loaded). Matches config/env.ts's
// existing getEnv() convention for the exact same reason. Still fails loud —
// just on first real use rather than at import time.
function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CONFIG_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to .env.local — required before any encrypted config field can be saved or read.",
    );
  }
  cachedKey = parseEncryptionKey(raw);
  return cachedKey;
}

/**
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 * @param keyOverride Only used by the key-rotation script — every real call
 * site in the app omits this and uses the current CONFIG_ENCRYPTION_KEY.
 */
export function encryptSecret(plaintext: string, keyOverride?: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyOverride ?? loadKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

/** @param keyOverride Only used by the key-rotation script — see encryptSecret's comment. */
export function decryptSecret(ciphertext: string, keyOverride?: Buffer): string {
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed ciphertext");
  const decipher = crypto.createDecipheriv(ALGORITHM, keyOverride ?? loadKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
