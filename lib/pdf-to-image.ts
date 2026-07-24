import { createCanvas } from "@napi-rs/canvas";

// Renders an uploaded PDF letterhead's first page to a PNG buffer at
// upload time, so the rest of the letterhead pipeline (lib/docx-letterhead.ts,
// lib/pdf-conversion.ts) only ever has to deal with a raster image — exactly
// like a directly-uploaded PNG/JPEG. Uses pdf.js's own documented Node.js
// rendering path: its "legacy" build auto-detects it's running in Node and
// uses a built-in NodeCanvasFactory (confirmed by reading the bundled
// source — it requires @napi-rs/canvas internally for any canvas it creates
// for its own internal needs, e.g. masks/patterns) — a prebuilt-binary
// package (no native compilation step), matching how @sparticuz/chromium is
// already used elsewhere in this codebase for puppeteer. Deliberately not
// implemented by screenshotting Chromium's PDF viewer: @sparticuz/chromium's
// build is stripped down for Lambda/Vercel size limits and may not include
// PDFium at all, and there's no supported API for it either way — this is
// the actually-documented, supported approach.
const RENDER_SCALE = 2;

export async function renderPdfFirstPageToPng(buffer: Buffer): Promise<Buffer> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;

  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));

    await page.render({
      // @napi-rs/canvas's Canvas implements the same surface pdf.js expects
      // from a browser HTMLCanvasElement (getContext("2d") etc.) — this is
      // the standard pairing pdf.js's own Node build is written against; the
      // type cast is only because @napi-rs/canvas's type doesn't literally
      // extend the DOM's HTMLCanvasElement type.
      canvas: canvas as unknown as HTMLCanvasElement,
      viewport,
    }).promise;

    return canvas.toBuffer("image/png");
  } finally {
    await loadingTask.destroy();
  }
}
