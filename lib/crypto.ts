import crypto from "node:crypto";

// AES-256-GCM field-level encryption for secrets stored in
// CompanyIntegrationConfig (n8n API credentials, SMTP passwords, social
// media OAuth client secrets/tokens) and CalendarConnection (OAuth access/
// refresh tokens) — the first field-level encryption capability in this
// codebase (SECURITY_STANDARDS.md's "Encryption for sensitive fields"
// mandate). Key rotation is intentionally not handled here — see
// CONFIG_ENCRYPTION_KEY's env var comment for the follow-up this implies.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV, GCM's recommended size
const KEY_LENGTH = 32; // AES-256

let cachedKey: Buffer | null = null;

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
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `CONFIG_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`,
    );
  }
  cachedKey = key;
  return key;
}

/** Format: base64(iv):base64(authTag):base64(ciphertext) */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, loadKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(ciphertext: string): string {
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed ciphertext");
  const decipher = crypto.createDecipheriv(ALGORITHM, loadKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
