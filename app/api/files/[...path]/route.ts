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

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...path]">) {
  const { path: segments } = await ctx.params;
  const storageKey = segments.join("/");
  const ext = storageKey.slice(storageKey.lastIndexOf("."));
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  try {
    const buffer = await readFileByKey(storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${INLINE_TYPES.has(contentType) ? "inline" : "attachment"}; filename="${segments[segments.length - 1]}"`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: { message: "File not found" } }, { status: 404 });
  }
}
