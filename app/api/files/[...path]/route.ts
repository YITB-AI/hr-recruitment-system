import { NextResponse } from "next/server";
import { readFileByKey } from "@/lib/file-storage";

const CONTENT_TYPES: Record<string, string> = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const INLINE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET(req: Request, ctx: RouteContext<"/api/files/[...path]">) {
  const { path: segments } = await ctx.params;
  const storageKey = segments.join("/");
  const ext = storageKey.slice(storageKey.lastIndexOf("."));
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  // The stored key is always a randomUUID-based blob path (see
  // lib/file-storage.ts's saveFile) — never a human-meaningful name. The
  // Content-Disposition header's filename wins over an <a download="..."> on
  // every major browser, so callers that want a real filename in the user's
  // downloads folder (e.g. generated documents) must pass it explicitly here
  // rather than relying on the client-side attribute alone. Sanitized to a
  // single quoted header token — strips quotes/CR/LF so it can't inject
  // extra header directives, and falls back to the raw storage segment
  // (today's behavior) when absent, e.g. avatars/templates/letterheads that
  // have no separate display name to offer.
  const requestedFilename = new URL(req.url).searchParams.get("filename");
  const safeFilename = requestedFilename?.replace(/["\r\n]/g, "").trim();
  const filename = safeFilename || segments[segments.length - 1];

  try {
    const buffer = await readFileByKey(storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${INLINE_TYPES.has(contentType) ? "inline" : "attachment"}; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: { message: "File not found" } }, { status: 404 });
  }
}
