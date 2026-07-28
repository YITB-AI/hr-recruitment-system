import { describe, it, expect } from "vitest";
import { Secret, TOTP } from "otpauth";
import { generateTotpSecret, verifyTotpCode, generateBackupCodes, hashBackupCodes, findAndConsumeBackupCode } from "@/lib/mfa";

function totpFor(secret: string): TOTP {
  return new TOTP({ issuer: "HR Platform", label: "test@example.com", secret: Secret.fromBase32(secret) });
}

describe("lib/mfa — TOTP", () => {
  it("verifies a freshly generated valid code", () => {
    const secret = generateTotpSecret();
    const code = totpFor(secret).generate();
    expect(verifyTotpCode(secret, "test@example.com", code)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode(secret, "test@example.com", "000000")).toBe(false);
  });

  it("rejects a code generated for a different secret", () => {
    const secretA = generateTotpSecret();
    const secretB = generateTotpSecret();
    const codeForA = totpFor(secretA).generate();
    expect(verifyTotpCode(secretB, "test@example.com", codeForA)).toBe(false);
  });
});

describe("lib/mfa — backup codes", () => {
  it("generates the requested number of unique codes", () => {
    const codes = generateBackupCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });

  it("consumes a backup code exactly once", async () => {
    const codes = generateBackupCodes(8);
    const hashes = await hashBackupCodes(codes);

    const first = await findAndConsumeBackupCode(hashes, codes[3]);
    expect(first.matched).toBe(true);
    expect(first.remainingHashes).toHaveLength(7);

    const second = await findAndConsumeBackupCode(first.remainingHashes, codes[3]);
    expect(second.matched).toBe(false);

    const other = await findAndConsumeBackupCode(first.remainingHashes, codes[5]);
    expect(other.matched).toBe(true);
  });

  it("rejects a garbage code without throwing", async () => {
    const codes = generateBackupCodes(4);
    const hashes = await hashBackupCodes(codes);
    const result = await findAndConsumeBackupCode(hashes, "NOT-A-REAL-CODE");
    expect(result.matched).toBe(false);
  });
});
