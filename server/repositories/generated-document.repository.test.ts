import { describe, it, expect, afterAll } from "vitest";
import { connectDB } from "@/server/db/connect";
import { Company, GeneratedDocument } from "@/models";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";

describe("generatedDocumentRepository.findByFileOrPdfUrlUnscoped", () => {
  const cleanupCompanyIds: string[] = [];

  afterAll(async () => {
    await GeneratedDocument.deleteMany({ companyId: { $in: cleanupCompanyIds } });
    await Company.deleteMany({ _id: { $in: cleanupCompanyIds } });
  });

  it("finds a document by its fileUrl and returns its owning companyId", async () => {
    await connectDB();
    const company = await Company.create({ name: "FileAccess Co", slug: `file-access-${Date.now()}`, status: "active" });
    cleanupCompanyIds.push(String(company._id));
    const url = `/api/files/documents/test-${Date.now()}.docx`;
    await GeneratedDocument.create({
      companyId: company._id,
      templateId: company._id,
      fileName: "test.docx",
      fileUrl: url,
      status: "generated",
    });

    const match = await generatedDocumentRepository.findByFileOrPdfUrlUnscoped(url);
    expect(match?.companyId).toBe(String(company._id));
  });

  it("returns null for a file that isn't a generated document (e.g. an avatar)", async () => {
    const match = await generatedDocumentRepository.findByFileOrPdfUrlUnscoped(`/api/files/avatars/no-such-file-${Date.now()}.png`);
    expect(match).toBeNull();
  });
});
