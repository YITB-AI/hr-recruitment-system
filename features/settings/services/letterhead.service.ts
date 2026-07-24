import { connectDB } from "@/server/db/connect";
import { letterheadRepository, type LetterheadRow } from "@/server/repositories/letterhead.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";
import { saveFile, deleteFileByKey } from "@/lib/file-storage";
import { getCurrentUser } from "@/lib/current-user";
import { requireRole } from "@/lib/auth/permissions";
import { renderPdfFirstPageToPng } from "@/lib/pdf-to-image";

const LETTERHEAD_FOLDER = "letterheads";
const MAX_LETTERHEAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_LETTERHEAD_TYPES = new Set(["image/png", "image/jpeg", "application/pdf"]);

// Read-only — every role needs to see the available letterheads to pick
// one when generating a document, so this is deliberately ungated (same
// convention as every other list*/get* read path in this codebase).
export async function listLetterheads(): Promise<LetterheadRow[]> {
  await connectDB();
  const { companyId } = await getCurrentUser();
  return letterheadRepository.findAllForCompany(companyId);
}

export async function uploadLetterhead(name: string, file: File): Promise<LetterheadRow> {
  if (!ALLOWED_LETTERHEAD_TYPES.has(file.type)) throw new Error("Only PNG, JPEG, or PDF files are supported");
  if (file.size > MAX_LETTERHEAD_BYTES) throw new Error("File must be smaller than 5MB");

  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");

  const isPdf = file.type === "application/pdf";
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  // The rest of the letterhead pipeline (lib/docx-letterhead.ts embedding
  // into the .docx header, lib/pdf-conversion.ts prepending into the PDF
  // preview) only ever deals with a raster image — a PDF upload is
  // rasterized once, here, at upload time, so nothing downstream needs to
  // know a PDF was ever involved.
  let buffer: Buffer;
  let storageFileName: string;
  if (isPdf) {
    try {
      buffer = await renderPdfFirstPageToPng(rawBuffer);
    } catch {
      throw new Error("Couldn't render this PDF — make sure it's a valid, unencrypted PDF file");
    }
    storageFileName = "letterhead.png";
  } else {
    buffer = rawBuffer;
    storageFileName = file.name;
  }

  const { storageKey } = await saveFile(LETTERHEAD_FOLDER, storageFileName, buffer);
  const imageUrl = `/api/files/${storageKey}`;

  const letterhead = await letterheadRepository.create({
    companyId: actor.companyId,
    name,
    imageUrl,
    createdBy: actor.id === "system" ? undefined : actor.id,
  });

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "letterhead.uploaded",
    entityType: "setting",
    entityId: letterhead._id,
    message: `${actor.name} uploaded the "${letterhead.name}" letterhead`,
  });

  return letterhead;
}

export async function deleteLetterhead(id: string): Promise<void> {
  await connectDB();
  const actor = await getCurrentUser();
  requireRole(actor, "settings.manage");

  const letterhead = await letterheadRepository.delete(actor.companyId, id);
  if (!letterhead) throw new Error("Letterhead not found");
  await deleteFileByKey(letterhead.imageUrl.replace("/api/files/", ""));

  await activityLogRepository.create({
    companyId: actor.companyId,
    actorId: actor.id === "system" ? undefined : actor.id,
    actorName: actor.name,
    action: "letterhead.deleted",
    entityType: "setting",
    entityId: id,
    message: `${actor.name} deleted the "${letterhead.name}" letterhead`,
  });
}
