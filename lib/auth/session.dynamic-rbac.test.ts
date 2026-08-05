import { describe, it, expect, afterAll, vi } from "vitest";

// See session.onboarding-flags.test.ts's identical comment: verifySessionToken's
// success path calls next/server's after(), which only works inside a real
// Next.js request scope.
vi.mock("next/server", () => ({ after: (fn: () => void) => fn() }));

import { connectDB } from "@/server/db/connect";
import { sessionRepository } from "@/server/repositories/session.repository";
import { verifySessionToken, generateSessionToken, hashSessionToken } from "@/lib/auth/session";
import { requireRole, ForbiddenError } from "@/lib/auth/permissions";
import { roleRepository } from "@/server/repositories/role.repository";
import { Company, User, UserSession } from "@/models";

// Proves the actual security-critical wiring end to end: verifySessionToken
// resolves a user's REAL Role document into SessionUser.permissions, and
// requireRole correctly enforces that resolved set — for both a built-in
// wildcard role and a custom, non-wildcard one. This is the one piece
// scripts/verify-dynamic-rbac.ts (run against staging separately) can't
// exercise directly, since it needs the after() mock above.
describe("Dynamic RBAC — verifySessionToken permission resolution", () => {
  let companyId: string;
  const userIds: string[] = [];
  const roleKeys: string[] = [];

  afterAll(async () => {
    await UserSession.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await Company.deleteOne({ _id: companyId });
  });

  async function createUserWithRole(role: string) {
    const user = await User.create({
      companyId,
      name: "Dynamic RBAC Test User",
      email: `dynamic-rbac-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`,
      passwordHash: "not-a-real-hash",
      role,
      mfaSetupCompletedAt: new Date(),
    });
    const token = generateSessionToken();
    await sessionRepository.create({ userId: String(user._id), companyId, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 60_000) });
    return { user, token };
  }

  it("resolves a custom role's exact permission array onto SessionUser, and requireRole enforces it", async () => {
    await connectDB();
    const company = await Company.create({ name: "Dynamic RBAC Test Co", slug: `dynamic-rbac-${Date.now()}`, status: "active" });
    companyId = String(company._id);

    const roleKey = `dynamic_rbac_test_${Date.now()}`;
    roleKeys.push(roleKey);
    await roleRepository.create({ key: roleKey, name: "Test Custom Role", permissions: ["employee.create", "employee.update"] });

    const { user, token } = await createUserWithRole(roleKey);
    userIds.push(String(user._id));

    const resolved = await verifySessionToken(token);
    expect(resolved).not.toBeNull();
    expect(Array.isArray(resolved!.permissions)).toBe(true);
    expect(resolved!.permissions).toEqual(expect.arrayContaining(["employee.create", "employee.update"]));
    expect((resolved!.permissions as string[]).length).toBe(2);

    expect(() => requireRole(resolved!, "employee.create")).not.toThrow();
    expect(() => requireRole(resolved!, "settings.manage")).toThrow(ForbiddenError);
  });

  it("resolves the built-in admin role to permissions:'*', and requireRole allows everything", async () => {
    const { user, token } = await createUserWithRole("admin");
    userIds.push(String(user._id));

    const resolved = await verifySessionToken(token);
    expect(resolved?.permissions).toBe("*");
    expect(() => requireRole(resolved!, "settings.manage")).not.toThrow();
    expect(() => requireRole(resolved!, "user.impersonate")).not.toThrow();
  });

  it("resolves the built-in interviewer role to an empty permission array, and requireRole denies every mutation", async () => {
    const { user, token } = await createUserWithRole("interviewer");
    userIds.push(String(user._id));

    const resolved = await verifySessionToken(token);
    expect(resolved?.permissions).toEqual([]);
    expect(() => requireRole(resolved!, "employee.create")).toThrow(ForbiddenError);
  });

  it("a role deleted out from under a user (edge case) resolves to an empty permission array, never '*'", async () => {
    const roleKey = `dynamic_rbac_ephemeral_${Date.now()}`;
    await roleRepository.create({ key: roleKey, name: "Ephemeral Role", permissions: ["job.create"] });
    const { user, token } = await createUserWithRole(roleKey);
    userIds.push(String(user._id));

    // Bypass the repository's own usage guard directly at the model layer —
    // simulating a data inconsistency that shouldn't happen through the
    // real delete path, to prove the fail-safe default holds even then.
    const { Role } = await import("@/models/Role");
    await Role.deleteOne({ key: roleKey });

    const resolved = await verifySessionToken(token);
    expect(resolved?.permissions).toEqual([]);
    expect(() => requireRole(resolved!, "job.create")).toThrow(ForbiddenError);
  });
});
