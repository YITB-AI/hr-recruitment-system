import { NextResponse, after } from "next/server";
import { readFileByKey } from "@/lib/file-storage";
import { getCurrentUser, resolveActorId } from "@/lib/current-user";
import { connectDB } from "@/server/db/connect";
import { generatedDocumentRepository } from "@/server/repositories/generated-document.repository";
import { activityLogRepository } from "@/server/repositories/activity-log.repository";

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
  // Authentication boundary for every file this app serves. Blob storage
  // itself is "private" access (see lib/file-storage.ts), but THIS route
  // holds the only credential able to reach it on a caller's behalf —
  // making this the app's real access-control boundary. It previously had
  // no check at all: any storage-key URL (embedded directly in page HTML
  // for images/downloads) would serve to anyone with no session required.
  // Found and fixed alongside this part's audit-logging work.
  const actor = await getCurrentUser();

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

  // If this file is a real generated document, confirm it belongs to the
  // caller's own company before serving it — a cross-tenant match is
  // rejected identically to "not found," never confirming a match exists
  // under another tenant. Other file types (avatars, letterheads,
  // templates, company logos) only get the auth check above for now —
  // this route only knows a raw storage key, not which model each of
  // those belongs to, so full tenant-scoping for them would need a
  // broader change not attempted in this pass.
  await connectDB();
  const matchedDocument = await generatedDocumentRepository.findByFileOrPdfUrlUnscoped(`/api/files/${storageKey}`);
  if (matchedDocument && matchedDocument.companyId !== actor.companyId) {
    return NextResponse.json({ success: false, error: { message: "File not found" } }, { status: 404 });
  }

  try {
    const buffer = await readFileByKey(storageKey);

    // Deferred via after() — a pure audit-trail write with no UI depending
    // on it having landed by the time the response returns, unlike the
    // notification-bell case elsewhere in this codebase that after() was
    // (wrongly) used for and then reverted.
    if (matchedDocument) {
      after(() =>
        activityLogRepository
          .create({
            companyId: actor.companyId,
            actorId: resolveActorId(actor),
            actorName: actor.name,
            action: "document.downloaded",
            entityType: "document",
            entityId: matchedDocument._id,
            message: `${actor.name} downloaded "${filename}"`,
          })
          .catch((error) => console.error("Failed to log document download:", error)),
      );
    }

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
