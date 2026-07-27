import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import mammoth from "mammoth";
import { DEFAULT_CONTENT_TOP_MARGIN_IN, DEFAULT_CONTENT_BOTTOM_MARGIN_IN, type LetterheadImage } from "@/lib/docx-letterhead";

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

// margin:0 on page.pdf() below hands Chromium's entire physical page to
// this HTML — the letterhead background (position:fixed, 100%x100%) then
// covers the FULL page including what would otherwise be blank margin, the
// same way an anchored/behindDoc image spans the full page in the real
// .docx (see lib/docx-letterhead.ts). Body padding recreates a normal text
// inset on top of that, standing in for what page.pdf()'s margin option
// used to do — sized dynamically per call (see buildBodyPaddingStyle) since
// the correct top/bottom inset depends on whether/which letterhead applies.
const BASE_PRINT_STYLES = `
  html, body { margin: 0; padding: 0; }
  body { font-family: "Calibri", "Segoe UI", Arial, sans-serif; font-size: 12pt; color: #1a1a1a; line-height: 1.5; position: relative; }
  .letterhead-background { position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  td, th { border: 1px solid #ccc; padding: 6px 8px; }
  img:not(.letterhead-background) { max-width: 100%; }
  p { margin: 0 0 8px; }
`;

// No letterhead at all -> ordinary document margins (matches this app's
// prior fixed padding). With a letterhead, its own top/bottom content
// margins apply instead, so body text clears the image's header/footer
// bands — see lib/docx-letterhead.ts's DEFAULT_CONTENT_*_MARGIN_IN comment
// for why this can't be computed automatically from the image alone.
const NO_LETTERHEAD_TOP_MARGIN_IN = 1;
const NO_LETTERHEAD_BOTTOM_MARGIN_IN = 0.75;

function buildBodyPaddingStyle(letterheadImage?: LetterheadImage | null): string {
  const topIn = letterheadImage ? letterheadImage.contentTopMarginIn ?? DEFAULT_CONTENT_TOP_MARGIN_IN : NO_LETTERHEAD_TOP_MARGIN_IN;
  const bottomIn = letterheadImage
    ? letterheadImage.contentBottomMarginIn ?? DEFAULT_CONTENT_BOTTOM_MARGIN_IN
    : NO_LETTERHEAD_BOTTOM_MARGIN_IN;
  return `body { padding: ${topIn}in 0.75in ${bottomIn}in; }`;
}

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
// HTML instead, as a full-page CSS background (position:fixed + object-fit:
// cover, sized via PRINT_STYLES's .letterhead-background rule) so the PDF
// preview visually matches the real .docx's anchored/behindDoc letterhead —
// a watermark/background behind the text, not a small banner above it.
// Chromium handles the "fill the page, crop the excess, never distort"
// sizing natively via object-fit:cover, unlike the .docx path which has to
// compute an explicit <a:srcRect> crop by hand.
function buildLetterheadBackgroundTag(letterheadImage: LetterheadImage): string {
  const mimeType = EXTENSION_MIME_TYPES[letterheadImage.extension.toLowerCase()] ?? "image/png";
  const base64 = letterheadImage.buffer.toString("base64");
  return `<img class="letterhead-background" src="data:${mimeType};base64,${base64}" alt="" />`;
}

// Not a pixel-perfect Word renderer — table/paragraph/image content
// survives, but precise fonts/spacing can shift slightly versus the
// original .docx. Good enough for a readable PDF copy, not a substitute for
// the real .docx when exact formatting matters.
export async function convertDocxToPdf(
  buffer: Buffer,
  sharedBrowser?: Browser,
  letterheadImage?: LetterheadImage | null,
): Promise<Buffer> {
  const { value: bodyHtml } = await mammoth.convertToHtml({ buffer });
  const letterheadHtml = letterheadImage ? buildLetterheadBackgroundTag(letterheadImage) : "";
  const styles = BASE_PRINT_STYLES + buildBodyPaddingStyle(letterheadImage);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body>${letterheadHtml}${bodyHtml}</body></html>`;

  const browser = sharedBrowser ?? (await launchBrowser());
  try {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "load" });
      const pdfBytes = await page.pdf({
        // Letter, not A4 — matches the real Letter-sized Word templates/
        // letterhead this app generates (confirmed via the pre-existing
        // Conformation Letter template's own header dimensions), so the
        // .docx and PDF outputs agree on page size, not just letterhead style.
        format: "letter",
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      });
      return Buffer.from(pdfBytes);
    } finally {
      await page.close();
    }
  } finally {
    if (!sharedBrowser) await browser.close();
  }
}
