import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Uploaded files live outside `public/` (never directly web-accessible) and
// are served through app/api/files/[...path]/route.ts, which can later add
// auth checks. Swap this for S3/Cloudflare R2 by changing only this module.
const STORAGE_ROOT = path.join(process.cwd(), "storage");

function safeJoin(...segments: string[]): string {
  const resolved = path.join(STORAGE_ROOT, ...segments);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

export async function saveFile(
  folder: string,
  originalFileName: string,
  buffer: Buffer,
): Promise<{ storageKey: string; fileName: string }> {
  const ext = path.extname(originalFileName);
  const fileName = `${randomUUID()}${ext}`;
  const storageKey = path.posix.join(folder, fileName);

  await mkdir(path.dirname(safeJoin(storageKey)), { recursive: true });
  await writeFile(safeJoin(storageKey), buffer);

  return { storageKey, fileName };
}

export async function readFileByKey(storageKey: string): Promise<Buffer> {
  return readFile(safeJoin(storageKey));
}

export async function deleteFileByKey(storageKey: string): Promise<void> {
  try {
    await unlink(safeJoin(storageKey));
  } catch {
    // Already gone — deleting a template whose file was manually removed
    // shouldn't block the DB delete.
  }
}
