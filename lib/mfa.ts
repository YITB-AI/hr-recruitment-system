import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Secret, TOTP } from "otpauth";

const TOTP_ISSUER = "HR Platform";
const BACKUP_CODE_COUNT = 8;
const BCRYPT_ROUNDS = 10;

function buildTotp(secret: string, accountLabel: string): TOTP {
  return new TOTP({ issuer: TOTP_ISSUER, label: accountLabel, secret: Secret.fromBase32(secret) });
}

/** A fresh random secret, base32-encoded — stored encrypted (see lib/crypto.ts) until the enrollment is confirmed. */
export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** Google Authenticator key URI, encoded into the enrollment QR code. */
export function buildTotpUri(secret: string, accountLabel: string): string {
  return buildTotp(secret, accountLabel).toString();
}

// window:1 tolerates the previous/next 30s time step, allowing for minor
// clock drift between the server and the user's authenticator app —
// otherwise a code entered right at a 30s boundary could spuriously fail.
export function verifyTotpCode(secret: string, accountLabel: string, code: string): boolean {
  const totp = buildTotp(secret, accountLabel);
  const delta = totp.validate({ token: code.trim(), window: 1 });
  return delta !== null;
}

function generateBackupCode(): string {
  const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 10)}`;
}

/** Shown to the user exactly once, at enrollment — only the hashed forms are ever persisted. */
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => generateBackupCode());
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, BCRYPT_ROUNDS)));
}

// Single-use: on a match, the matched hash is removed from the returned
// array so the caller can persist the shrunk list — the same code can
// never be redeemed twice.
export async function findAndConsumeBackupCode(
  hashes: string[],
  candidate: string,
): Promise<{ matched: boolean; remainingHashes: string[] }> {
  const trimmed = candidate.trim();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(trimmed, hashes[i])) {
      return { matched: true, remainingHashes: [...hashes.slice(0, i), ...hashes.slice(i + 1)] };
    }
  }
  return { matched: false, remainingHashes: hashes };
}
