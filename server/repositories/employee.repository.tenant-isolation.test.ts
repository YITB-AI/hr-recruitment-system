import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { connectDB } from "@/server/db/connect";
import { Company, Employee } from "@/models";
import { employeeRepository } from "@/server/repositories/employee.repository";

describe("employeeRepository — tenant isolation", () => {
  let companyAId: string;
  let companyBId: string;
  let employeeAId: string;

  beforeAll(async () => {
    await connectDB();
    const companyA = await Company.create({ name: "Tenant A", slug: `tenant-a-${Date.now()}`, status: "active" });
    const companyB = await Company.create({ name: "Tenant B", slug: `tenant-b-${Date.now()}`, status: "active" });
    companyAId = String(companyA._id);
    companyBId = String(companyB._id);

    const employeeA = await employeeRepository.create(companyAId, {
      employeeCode: "EMP-A-1",
      name: "Company A Employee",
      email: `tenant-iso-${Date.now()}@example.invalid`,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: 90000,
      grossSalary: 120000,
    });
    employeeAId = employeeA._id;
  });

  afterAll(async () => {
    await Employee.deleteMany({ companyId: { $in: [companyAId, companyBId] } });
    await Company.deleteMany({ _id: { $in: [companyAId, companyBId] } });
  });

  it("company B cannot fetch company A's employee by id (IDOR check)", async () => {
    const result = await employeeRepository.findById(companyBId, employeeAId);
    expect(result).toBeNull();
  });

  it("company A can fetch its own employee", async () => {
    const result = await employeeRepository.findById(companyAId, employeeAId);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Company A Employee");
  });

  it("company B's employee list never includes company A's employee", async () => {
    const { rows } = await employeeRepository.findAll(companyBId, { page: 1, pageSize: 100 });
    expect(rows.find((r) => r._id === employeeAId)).toBeUndefined();
  });

  it("two different companies can each create an employee with the same email", async () => {
    const sharedEmail = `shared-email-${Date.now()}@example.invalid`;
    const employeeA = await employeeRepository.create(companyAId, {
      employeeCode: "EMP-A-2",
      name: "Shared Email A",
      email: sharedEmail,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: 90000,
      grossSalary: 120000,
    });
    const employeeB = await employeeRepository.create(companyBId, {
      employeeCode: "EMP-B-1",
      name: "Shared Email B",
      email: sharedEmail,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: 90000,
      grossSalary: 120000,
    });
    expect(employeeA._id).not.toBe(employeeB._id);

    await Employee.deleteMany({ _id: { $in: [employeeA._id, employeeB._id] } });
  });

  it("existsByEmail only reports a collision within the caller's own company", async () => {
    const email = `existsbyemail-${Date.now()}@example.invalid`;
    const employeeA = await employeeRepository.create(companyAId, {
      employeeCode: "EMP-A-3",
      name: "Exists Check A",
      email,
      department: "Engineering",
      designation: "Engineer",
      joiningDate: new Date(),
      employmentType: "full_time",
      employmentStatus: "active",
      basicSalary: 90000,
      grossSalary: 120000,
    });

    expect(await employeeRepository.existsByEmail(companyAId, email)).toBe(true);
    expect(await employeeRepository.existsByEmail(companyBId, email)).toBe(false);
    expect(await employeeRepository.existsByEmail(companyAId, email, employeeA._id)).toBe(false);

    await Employee.deleteOne({ _id: employeeA._id });
  });
});
