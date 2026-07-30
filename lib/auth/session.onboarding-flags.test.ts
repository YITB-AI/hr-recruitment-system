import { describe, it, expect, afterAll, vi } from "vitest";

// verifySessionToken's success path calls next/server's after() to defer
// touching lastActiveAt — a real Next.js request scope, which doesn't exist
// under Vitest. Every other existing test that calls verifySessionToken
// happens to only exercise its early-return (revoked/not-found) path, which
// never reaches this call, so this is the first test to need a stub.
vi.mock("next/server", () => ({ after: (fn: () => void) => fn() }));

import { connectDB } from "@/server/db/connect";
import { sessionRepository } from "@/server/repositories/session.repository";
import { verifySessionToken, generateSessionToken, hashSessionToken } from "@/lib/auth/session";
import { Company, User, UserSession } from "@/models";

// Locks in the exact behavior the first-login-flow fix depends on:
// mustChangePassword and mfaSetupRequired must both be correctly computed
// on the SessionUser returned by verifySessionToken, for every combination
// — and, critically, mfaSetupRequired must stay false once
// mfaSetupCompletedAt is set even if mfaEnabled is later flipped back to
// false (the exact regression this fix exists to prevent).

async function createTestUser(companyId: string, overrides: Record<string, unknown>) {
  const user = await User.create({
    companyId,
    name: "Onboarding Flags Test User",
    email: `onboarding-flags-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`,
    passwordHash: "not-a-real-hash",
    role: "admin",
    ...overrides,
  });
  const token = generateSessionToken();
  await sessionRepository.create({
    userId: String(user._id),
    companyId,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { user, token };
}

describe("verifySessionToken — mustChangePassword / mfaSetupRequired", () => {
  let companyId: string;
  const userIds: string[] = [];

  afterAll(async () => {
    await UserSession.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await Company.deleteOne({ _id: companyId });
  });

  it("a freshly-provisioned admin needs both a password change and MFA setup", async () => {
    await connectDB();
    const company = await Company.create({ name: "Onboarding Flags Co", slug: `onboarding-flags-${Date.now()}`, status: "active" });
    companyId = String(company._id);

    const { user, token } = await createTestUser(companyId, { mustChangePassword: true });
    userIds.push(String(user._id));

    const verified = await verifySessionToken(token);
    expect(verified?.mustChangePassword).toBe(true);
    expect(verified?.mfaSetupRequired).toBe(true);
  });

  it("an admin who already changed their password but never set up MFA still needs MFA setup only", async () => {
    const { user, token } = await createTestUser(companyId, { mustChangePassword: false });
    userIds.push(String(user._id));

    const verified = await verifySessionToken(token);
    expect(verified?.mustChangePassword).toBe(false);
    expect(verified?.mfaSetupRequired).toBe(true);
  });

  it("an admin who has completed MFA setup needs neither", async () => {
    const { user, token } = await createTestUser(companyId, {
      mustChangePassword: false,
      mfaEnabled: true,
      mfaSetupCompletedAt: new Date(),
    });
    userIds.push(String(user._id));

    const verified = await verifySessionToken(token);
    expect(verified?.mustChangePassword).toBe(false);
    expect(verified?.mfaSetupRequired).toBe(false);
  });

  it("REGRESSION: an admin who completed MFA setup once, then disabled MFA, is never asked again", async () => {
    const { user, token } = await createTestUser(companyId, {
      mustChangePassword: false,
      // Mirrors exactly what disableMfa does: mfaEnabled flips to false,
      // mfaEnabledAt is unset — but mfaSetupCompletedAt survives.
      mfaEnabled: false,
      mfaSetupCompletedAt: new Date(),
    });
    userIds.push(String(user._id));

    const verified = await verifySessionToken(token);
    expect(verified?.mfaSetupRequired).toBe(false);
  });

  it("a non-admin role is never required to set up MFA, even with no mfaSetupCompletedAt", async () => {
    const { user, token } = await createTestUser(companyId, { role: "hr", mustChangePassword: false });
    userIds.push(String(user._id));

    const verified = await verifySessionToken(token);
    expect(verified?.mfaSetupRequired).toBe(false);
  });
});
