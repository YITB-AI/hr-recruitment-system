import { describe, it, expect } from "vitest";
import { encryptSecret } from "@/lib/crypto";
import { createMfaPendingToken, verifyMfaPendingToken } from "@/lib/auth/mfa-pending-token";

describe("lib/auth/mfa-pending-token", () => {
  it("round-trips the exact original payload", () => {
    const token = createMfaPendingToken({
      userId: "user123",
      companyId: "company456",
      rememberMe: true,
      userAgent: "test-agent",
      ipAddress: "1.2.3.4",
    });
    const verified = verifyMfaPendingToken(token);
    expect(verified).toEqual({
      userId: "user123",
      companyId: "company456",
      rememberMe: true,
      userAgent: "test-agent",
      ipAddress: "1.2.3.4",
    });
  });

  it("rejects a tampered token (GCM authTag mismatch)", () => {
    const token = createMfaPendingToken({ userId: "user123", companyId: "company456", rememberMe: false });
    const tampered = token.slice(0, -4) + "abcd";
    expect(verifyMfaPendingToken(tampered)).toBeNull();
  });

  it("rejects garbage input without throwing", () => {
    expect(verifyMfaPendingToken("not-a-real-token")).toBeNull();
  });

  it("rejects an expired token", () => {
    const expiredPayload = encryptSecret(
      JSON.stringify({ userId: "user123", companyId: "company456", rememberMe: false, exp: Date.now() - 1000 }),
    );
    expect(verifyMfaPendingToken(expiredPayload)).toBeNull();
  });
});
