import { put, get, del } from "@vercel/blob";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Vercel Blob (private access) — serverless functions don't have a
// persistent local disk, so uploaded templates and generated documents live
// here instead. Private access means files require BLOB_READ_WRITE_TOKEN to
// read/delete (via this module), rather than being fetchable by anyone who
// guesses/finds the URL — appropriate given this data includes salaries and
// personal details. Callers only ever see a `storageKey`; they never talk to
// Blob directly, so swapping providers again later only means editing this file.

export async function saveFile(
  folder: string,
  originalFileName: string,
  buffer: Buffer,
): Promise<{ storageKey: string; fileName: string }> {
  const ext = path.extname(originalFileName);
  const fileName = `${randomUUID()}${ext}`;
  const pathname = `${folder}/${fileName}`;

  const blob = await put(pathname, buffer, {
    access: "private",
    addRandomSuffix: false,
  });

  return { storageKey: blob.pathname, fileName };
}

export async function readFileByKey(storageKey: string): Promise<Buffer> {
  const result = await get(storageKey, { access: "private" });
  if (!result?.stream) throw new Error("File not found");

  const arrayBuffer = await new Response(result.stream).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFileByKey(storageKey: string): Promise<void> {
  try {
    await del(storageKey);
  } catch {
    // Already gone — deleting a template whose file was manually removed
    // shouldn't block the DB delete.
  }
}
