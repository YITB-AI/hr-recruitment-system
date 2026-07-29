import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectDB } from "@/server/db/connect";
import { userRepository } from "@/server/repositories/user.repository";
import { Company, User } from "@/models";

describe("userRepository — email uniqueness is scoped per-company, not global", () => {
  let companyAId: string;
  let companyBId: string;
  const sharedEmail = `shared-${Date.now()}@example.invalid`;
  let userAId: string;

  beforeAll(async () => {
    await connectDB();
    // Mongoose builds autoIndex-es asynchronously after connecting — this
    // test relies on the real compound {companyId, email} unique index
    // actually existing, so wait for it explicitly rather than racing it.
    await User.init();
    const companyA = await Company.create({ name: "Email Tenancy Co A", slug: `email-tenancy-a-${Date.now()}`, status: "active" });
    const companyB = await Company.create({ name: "Email Tenancy Co B", slug: `email-tenancy-b-${Date.now()}`, status: "active" });
    companyAId = String(companyA._id);
    companyBId = String(companyB._id);

    const userA = await User.create({
      companyId: companyAId,
      name: "User At Company A",
      email: sharedEmail,
      passwordHash: "not-a-real-hash",
      role: "hr",
    });
    userAId = String(userA._id);
  });

  afterAll(async () => {
    await User.deleteMany({ companyId: { $in: [companyAId, companyBId] } });
    await Company.deleteMany({ _id: { $in: [companyAId, companyBId] } });
  });

  it("findByEmail only reports a collision within the caller's own company", async () => {
    expect(await userRepository.findByEmail(companyAId, sharedEmail)).not.toBeNull();
    expect(await userRepository.findByEmail(companyBId, sharedEmail)).toBeNull();
  });

  it("isEmailTaken only reports a collision within the caller's own company", async () => {
    expect(await userRepository.isEmailTaken(companyAId, sharedEmail, "000000000000000000000000")).toBe(true);
    expect(await userRepository.isEmailTaken(companyBId, sharedEmail, "000000000000000000000000")).toBe(false);
  });

  it("the same email CAN be used to create a user at a different company", async () => {
    const userB = await User.create({
      companyId: companyBId,
      name: "User At Company B",
      email: sharedEmail,
      passwordHash: "not-a-real-hash",
      role: "hr",
    });
    expect(String(userB._id)).not.toBe(userAId);
    await User.deleteOne({ _id: userB._id });
  });

  it("creating a second user with the same email WITHIN the same company is still rejected", async () => {
    await expect(
      User.create({
        companyId: companyAId,
        name: "Duplicate User At Company A",
        email: sharedEmail,
        passwordHash: "not-a-real-hash",
        role: "hr",
      }),
    ).rejects.toThrow();
  });
});
