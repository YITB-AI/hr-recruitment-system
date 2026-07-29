import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectDB } from "@/server/db/connect";
import { sessionRepository } from "@/server/repositories/session.repository";
import { verifySessionToken, generateSessionToken, hashSessionToken } from "@/lib/auth/session";
import { Company, User, UserSession } from "@/models";

describe("sessionRepository.revokeOne", () => {
  let companyId: string;
  let userId: string;
  let sessionAId: string;
  let sessionBId: string;
  let tokenA: string;

  beforeAll(async () => {
    await connectDB();
    const company = await Company.create({ name: "Session Test Co", slug: `session-test-${Date.now()}`, status: "active" });
    companyId = String(company._id);
    const user = await User.create({
      companyId,
      name: "Session Test User",
      email: `session-test-${Date.now()}@example.invalid`,
      passwordHash: "not-a-real-hash",
      role: "hr",
    });
    userId = String(user._id);

    tokenA = generateSessionToken();
    const sessionA = await sessionRepository.create({
      userId,
      companyId,
      tokenHash: hashSessionToken(tokenA),
      expiresAt: new Date(Date.now() + 60_000),
    });
    sessionAId = sessionA._id;

    const sessionB = await sessionRepository.create({
      userId,
      companyId,
      tokenHash: hashSessionToken(generateSessionToken()),
      expiresAt: new Date(Date.now() + 60_000),
    });
    sessionBId = sessionB._id;
  });

  afterAll(async () => {
    await UserSession.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
    await Company.deleteOne({ _id: companyId });
  });

  it("revokes only the matching user+session pair", async () => {
    const otherUserResult = await sessionRepository.revokeOne("000000000000000000000000", sessionAId);
    expect(otherUserResult).toBe(false);

    const result = await sessionRepository.revokeOne(userId, sessionAId);
    expect(result).toBe(true);
  });

  it("a revoked session is correctly rejected on the next verifySessionToken call", async () => {
    const verified = await verifySessionToken(tokenA);
    expect(verified).toBeNull();
  });

  it("revoking an already-revoked session returns false (not a repeat success)", async () => {
    const result = await sessionRepository.revokeOne(userId, sessionAId);
    expect(result).toBe(false);
  });

  it("a different, still-active session for the same user is unaffected", async () => {
    const active = await sessionRepository.findActiveForUser(userId);
    expect(active.find((s) => s._id === sessionBId)).toBeDefined();
    expect(active.find((s) => s._id === sessionAId)).toBeUndefined();
  });
});
