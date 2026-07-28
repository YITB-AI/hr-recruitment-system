import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Company, Employee } from "@/models";
import { employeeRepository } from "@/server/repositories/employee.repository";

describe("employeeRepository — salary encryption", () => {
  let companyId: string;

  beforeAll(async () => {
    await connectDB();
    const company = await Company.create({ name: "Test Co", slug: `test-co-${Date.now()}`, status: "active" });
    companyId = String(company._id);
  });

  afterAll(async () => {
    await Employee.deleteMany({ companyId });
    await Company.deleteOne({ _id: companyId });
  });

  it("stores salary fields as ciphertext, not plain numbers", async () => {
    const created = await employeeRepository.create(companyId, {
      employeeCode: "EMP-TEST-1",
      name: "Test Employee",
      email: `test-${Date.now()}@example.invalid`,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: 75000,
      grossSalary: 100000,
    });

    expect(created.basicSalary).toBe(75000);
    expect(created.grossSalary).toBe(100000);

    const rawDoc = await Employee.collection.findOne({ _id: new mongoose.Types.ObjectId(created._id) });
    expect(typeof rawDoc?.basicSalary).toBe("string");
    expect(rawDoc?.basicSalary).not.toBe("75000");
    expect((rawDoc?.basicSalary as string).split(":")).toHaveLength(3);
  });

  it("decrypts correctly via findById and findAllForPicker", async () => {
    const created = await employeeRepository.create(companyId, {
      employeeCode: "EMP-TEST-2",
      name: "Test Employee 2",
      email: `test-${Date.now()}-2@example.invalid`,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: 60000,
      grossSalary: 82000,
    });

    const fetched = await employeeRepository.findById(companyId, created._id);
    expect(fetched?.basicSalary).toBe(60000);
    expect(fetched?.grossSalary).toBe(82000);

    const picked = await employeeRepository.findAllForPicker(companyId);
    const row = picked.find((r) => r._id === created._id);
    expect(row?.basicSalary).toBe(60000);
    expect(row?.grossSalary).toBe(82000);
  });

  it("re-encrypts only the changed field on update", async () => {
    const created = await employeeRepository.create(companyId, {
      employeeCode: "EMP-TEST-3",
      name: "Test Employee 3",
      email: `test-${Date.now()}-3@example.invalid`,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: 50000,
      grossSalary: 70000,
    });

    const updated = await employeeRepository.update(companyId, created._id, { basicSalary: 55000 });
    expect(updated?.basicSalary).toBe(55000);
    expect(updated?.grossSalary).toBe(70000);
  });

  it("reads a legacy plaintext-number row correctly via the fallback", async () => {
    const legacy = await Employee.create({
      companyId,
      employeeCode: "EMP-TEST-4",
      name: "Legacy Employee",
      email: `test-${Date.now()}-4@example.invalid`,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: "placeholder",
      grossSalary: "placeholder",
    });
    // Bypasses Mongoose's own String-typed casting to simulate a row
    // written before this field was encrypted, when it was a real BSON number.
    await Employee.collection.updateOne({ _id: legacy._id }, { $set: { basicSalary: 45000, grossSalary: 60000 } });

    const fetched = await employeeRepository.findById(companyId, String(legacy._id));
    expect(fetched?.basicSalary).toBe(45000);
    expect(fetched?.grossSalary).toBe(60000);
  });
});
