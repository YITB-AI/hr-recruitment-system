import { encryptSecret, decryptSecret } from "@/lib/crypto";

// A short-lived "password verified, MFA not yet confirmed" token — built on
// lib/crypto.ts's AES-256-GCM encrypt/decrypt rather than a new mechanism
// (GCM's authTag gives tamper detection for free, so a corrupted/forged
// token fails to decrypt rather than silently parsing into garbage).
// Deliberately NOT a models/Session.ts row: Session represents a fully-
// authenticated session everywhere else in this codebase (~150+
// getCurrentUser() call sites trust it implicitly) — keeping this pending
// state structurally separate means there is no code path by which a
// login that hasn't cleared MFA yet could ever be mistaken for a real one.
export const MFA_PENDING_COOKIE_NAME = "mfa_pending";
const MFA_PENDING_TTL_MS = 5 * 60 * 1000;

export type MfaPendingPayload = {
  userId: string;
  companyId: string;
  rememberMe: boolean;
  userAgent?: string;
  ipAddress?: string;
};

type StoredPayload = MfaPendingPayload & { exp: number };

export function createMfaPendingToken(input: MfaPendingPayload): string {
  const stored: StoredPayload = { ...input, exp: Date.now() + MFA_PENDING_TTL_MS };
  return encryptSecret(JSON.stringify(stored));
}

export function verifyMfaPendingToken(token: string): MfaPendingPayload | null {
  try {
    const stored = JSON.parse(decryptSecret(token)) as Partial<StoredPayload>;
    if (typeof stored.exp !== "number" || stored.exp < Date.now()) return null;
    if (typeof stored.userId !== "string" || typeof stored.companyId !== "string" || typeof stored.rememberMe !== "boolean") return null;
    return { userId: stored.userId, companyId: stored.companyId, rememberMe: stored.rememberMe, userAgent: stored.userAgent, ipAddress: stored.ipAddress };
  } catch {
    // Malformed, tampered (authTag mismatch), or otherwise undecryptable —
    // always treated as "no valid pending login," never thrown further.
    return null;
  }
}
