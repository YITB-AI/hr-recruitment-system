import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import mammoth from "mammoth";
import { getLetterheadDisplaySizeInches } from "@/lib/docx-letterhead";

// DOCX -> PDF with no external service and no Docker: mammoth turns the
// .docx into HTML, then a headless Chromium prints that HTML to PDF.
// @sparticuz/chromium ships a prebuilt binary for Vercel/Lambda's Linux
// runtime — it cannot execute on a local Windows/macOS dev machine. For
// local testing, set PUPPETEER_EXECUTABLE_PATH to a real local Chrome/
// Chromium install; in production (no env var set) this always resolves to
// the bundled serverless binary.
async function launchBrowser(): Promise<Browser> {
  const localExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (localExecutablePath) {
    return puppeteer.launch({ executablePath: localExecutablePath, headless: true });
  }
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

// Bulk generation converts several documents in one request — launching a
// fresh browser per document would multiply Chromium's ~1-2s cold-start by
// every recipient. Callers doing more than one conversion in a single
// request should launch once via this and pass it to every convertDocxToPdf
// call, then close it themselves once all conversions are done.
export async function launchSharedPdfBrowser(): Promise<Browser> {
  return launchBrowser();
}

const PRINT_STYLES = `
  body { font-family: "Calibri", "Segoe UI", Arial, sans-serif; font-size: 12pt; color: #1a1a1a; line-height: 1.5; padding: 32px 48px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  td, th { border: 1px solid #ccc; padding: 6px 8px; }
  img { max-width: 100%; }
  p { margin: 0 0 8px; }
`;

const EXTENSION_MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
};

// mammoth (below) only ever reads a .docx's BODY — it has no support for
// headers/footers at all, so the real letterhead embedded there by
// lib/docx-letterhead.ts can never appear in this PDF path by reading the
// .docx itself. This prepends the same letterhead image directly into the
// HTML instead, at the identical size computed for the .docx version (see
// getLetterheadDisplaySizeInches), so the PDF preview and the real .docx
// visually agree. Appears once at the top of page 1 only — unlike a true
// Word header, it does not repeat on every page of a multi-page document.
function buildLetterheadImgTag(letterheadImage: { buffer: Buffer; extension: string }): string {
  const { widthIn, heightIn } = getLetterheadDisplaySizeInches(letterheadImage.buffer);
  const mimeType = EXTENSION_MIME_TYPES[letterheadImage.extension.toLowerCase()] ?? "image/png";
  const base64 = letterheadImage.buffer.toString("base64");
  return `<img src="data:${mimeType};base64,${base64}" style="display:block;margin:0 auto 16px;width:${widthIn}in;height:${heightIn}in;" />`;
}

// Not a pixel-perfect Word renderer — table/paragraph/image content
// survives, but precise fonts/spacing can shift slightly versus the
// original .docx. Good enough for a readable PDF copy, not a substitute for
// the real .docx when exact formatting matters.
export async function convertDocxToPdf(
  buffer: Buffer,
  sharedBrowser?: Browser,
  letterheadImage?: { buffer: Buffer; extension: string } | null,
): Promise<Buffer> {
  const { value: bodyHtml } = await mammoth.convertToHtml({ buffer });
  const letterheadHtml = letterheadImage ? buildLetterheadImgTag(letterheadImage) : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_STYLES}</style></head><body>${letterheadHtml}${bodyHtml}</body></html>`;

  const browser = sharedBrowser ?? (await launchBrowser());
  try {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "load" });
      const pdfBytes = await page.pdf({
        format: "a4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });
      return Buffer.from(pdfBytes);
    } finally {
      await page.close();
    }
  } finally {
    if (!sharedBrowser) await browser.close();
  }
}
