import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectDB } from "@/server/db/connect";
import { Company, SavedView } from "@/models";
import { savedViewRepository } from "@/server/repositories/saved-view.repository";

describe("savedViewRepository — tenant isolation", () => {
  let companyAId: string;
  let companyBId: string;

  beforeAll(async () => {
    await connectDB();
    const companyA = await Company.create({ name: "SavedView Tenant A", slug: `sv-tenant-a-${Date.now()}`, status: "active" });
    const companyB = await Company.create({ name: "SavedView Tenant B", slug: `sv-tenant-b-${Date.now()}`, status: "active" });
    companyAId = String(companyA._id);
    companyBId = String(companyB._id);
  });

  afterAll(async () => {
    await SavedView.deleteMany({ companyId: { $in: [companyAId, companyBId] } });
    await Company.deleteMany({ _id: { $in: [companyAId, companyBId] } });
  });

  it("two different companies can each create a saved view with the same name", async () => {
    const viewA = await savedViewRepository.create(companyAId, { name: "Shortlisted", filters: { status: "shortlisted" } });
    const viewB = await savedViewRepository.create(companyBId, { name: "Shortlisted", filters: { status: "shortlisted" } });
    expect(viewA._id).not.toBe(viewB._id);
  });

  it("existsByName only reports a collision within the caller's own company", async () => {
    expect(await savedViewRepository.existsByName(companyAId, "Shortlisted")).toBe(true);
    expect(await savedViewRepository.existsByName(companyBId, "Some Other Name")).toBe(false);
  });

  it("company B's saved views never include company A's saved view", async () => {
    const rowsB = await savedViewRepository.findAll(companyBId);
    const rowsA = await savedViewRepository.findAll(companyAId);
    expect(rowsA.length).toBeGreaterThan(0);
    expect(rowsB.every((v) => !rowsA.some((a) => a._id === v._id))).toBe(true);
  });
});
