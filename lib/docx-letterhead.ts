import PizZip from "pizzip";
import { getImageDimensions } from "@/lib/image-dimensions";

// Auto-injects a company-uploaded letterhead IMAGE into a .docx template's
// Word header, IN MEMORY at generation time, so every generated document
// carries it without an admin ever having to edit the template file itself.
// The uploaded image is a COMPLETE, pre-designed letterhead (logo + name +
// address + whatever decoration, however the admin designed it) — this
// embeds it as-is, full page width, aspect-ratio preserved. No separate
// logo/text composition; the admin's image already carries whatever
// branding it needs.
//
// Hand-builds the final drawing/media/relationship XML directly, rather
// than relying on docxtemplater-image-module-free's {{%tag}} substitution
// — confirmed by direct testing that this free fork only wires up image
// replacement for the document BODY, silently leaving an empty run for an
// image tag placed inside a header/footer part (no error, no image).

const HEADER_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
const IMAGE_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const HEADER_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml";

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
};

// 914400 EMU = 1 inch (the standard OOXML drawingml conversion). 6.5in
// matches a US Letter page's text width inside standard 1in margins
// (8.5in - 1in - 1in). MAX_HEIGHT caps how tall the letterhead can ever
// get — confirmed necessary by a real upload: a 585x757px (portrait,
// width/height ~0.77) image, fit to the full 6.5in width with no height
// cap, produced an 8.4in-tall header that swallowed almost the entire
// page. Real letterhead banners are wide-and-short; this fits BOTH
// constraints (width first, falling back to height if that would exceed
// the cap) so a portrait-shaped upload shrinks proportionally instead of
// stretching to dominate the page.
const MAX_WIDTH_EMU = Math.round(6.5 * 914400);
const MAX_HEIGHT_EMU = Math.round(1.5 * 914400);
// Fallback used only if the uploaded image's real dimensions can't be read
// (corrupt/unrecognized format) — a reasonable banner aspect ratio.
const FALLBACK_ASPECT_RATIO = 6.5 / 1.2;

function computeLetterheadSize(aspectRatio: number): { widthEmu: number; heightEmu: number } {
  let widthEmu = MAX_WIDTH_EMU;
  let heightEmu = Math.round(widthEmu / aspectRatio);
  if (heightEmu > MAX_HEIGHT_EMU) {
    heightEmu = MAX_HEIGHT_EMU;
    widthEmu = Math.round(heightEmu * aspectRatio);
  }
  return { widthEmu, heightEmu };
}

/**
 * Shared sizing so the letterhead renders at the IDENTICAL size in both
 * the real .docx (via injectLetterheadHeader) and the PDF preview (via
 * lib/pdf-conversion.ts, which can't read the .docx header at all — see
 * that file's comment — so it needs the same numbers independently).
 */
export function getLetterheadDisplaySizeInches(buffer: Buffer): { widthIn: number; heightIn: number } {
  const dimensions = getImageDimensions(buffer);
  const aspectRatio = dimensions && dimensions.width > 0 ? dimensions.width / dimensions.height : FALLBACK_ASPECT_RATIO;
  const { widthEmu, heightEmu } = computeLetterheadSize(aspectRatio);
  return { widthIn: widthEmu / 914400, heightIn: heightEmu / 914400 };
}

export type LetterheadImage = { buffer: Buffer; extension: string };

function nextFreeRelId(relsXml: string): string {
  const ids = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => Number(m[1]));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `rId${max + 1}`;
}

function nextFreeHeaderFileName(zip: PizZip): string {
  let n = 1;
  while (zip.file(`word/header${n}.xml`)) n++;
  return `header${n}.xml`;
}

function nextFreeMediaFileName(zip: PizZip, extension: string): string {
  let n = 1;
  while (zip.file(`word/media/letterhead${n}.${extension}`)) n++;
  return `letterhead${n}.${extension}`;
}

function buildDrawingXml(relId: string, widthEmu: number, heightEmu: number): string {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Letterhead" descr="Letterhead"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Letterhead"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

/**
 * Returns the buffer UNCHANGED (a no-op) when:
 * - the zip isn't a readable .docx, or
 * - the template already declares any header of its own (never clobber
 *   an admin's own custom header — this feature only applies to
 *   templates that don't have one).
 *
 * When the document has a body-level `<w:sectPr>`, a headerReference is
 * added to it (true multi-section documents only get the FIRST section's
 * sectPr touched — a documented, accepted simplification; real
 * single-page HR letters are always single-section). When there's no
 * `<w:sectPr>` at all — the common case for this app's own seed/
 * test-script-authored templates, as opposed to genuine Word-saved files,
 * which always have one — a minimal one (just the headerReference; Word
 * supplies its own defaults for pgSz/pgMar/etc., all optional per the
 * OOXML schema) is appended as the last child of `<w:body>`, also
 * schema-correct.
 */
export function injectLetterheadHeader(buffer: Buffer, letterhead: LetterheadImage): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    return buffer;
  }

  const documentXmlFile = zip.file("word/document.xml");
  const contentTypesFile = zip.file("[Content_Types].xml");
  if (!documentXmlFile || !contentTypesFile) return buffer;
  const documentXml = documentXmlFile.asText();
  if (!documentXml.includes("</w:body>")) return buffer;

  const docRelsPath = "word/_rels/document.xml.rels";
  const docRelsFile = zip.file(docRelsPath);
  const docRelsXml =
    docRelsFile?.asText() ??
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  if (docRelsXml.includes(HEADER_REL_TYPE)) return buffer;

  const sectPrMatch = documentXml.match(/<w:sectPr(\s[^>]*)?(\/?)>/);
  const headerFileName = nextFreeHeaderFileName(zip);
  const headerRelId = nextFreeRelId(docRelsXml);

  let contentTypesXml = contentTypesFile.asText();
  if (!contentTypesXml.includes(`/word/${headerFileName}`)) {
    contentTypesXml = contentTypesXml.replace(
      "</Types>",
      `<Override PartName="/word/${headerFileName}" ContentType="${HEADER_CONTENT_TYPE}"/></Types>`,
    );
  }

  const extension = letterhead.extension.toLowerCase();
  const contentType = EXTENSION_CONTENT_TYPES[extension] ?? "image/png";
  if (!contentTypesXml.includes(`Extension="${extension}"`)) {
    contentTypesXml = contentTypesXml.replace("</Types>", `<Default Extension="${extension}" ContentType="${contentType}"/></Types>`);
  }

  const { widthIn, heightIn } = getLetterheadDisplaySizeInches(letterhead.buffer);
  const widthEmu = Math.round(widthIn * 914400);
  const heightEmu = Math.round(heightIn * 914400);

  const mediaFileName = nextFreeMediaFileName(zip, extension);
  zip.file(`word/media/${mediaFileName}`, letterhead.buffer, { binary: true });

  const headerRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${IMAGE_REL_TYPE}" Target="media/${mediaFileName}"/></Relationships>`;

  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${buildDrawingXml("rId1", widthEmu, heightEmu)}</w:r></w:p>
</w:hdr>`;

  const newDocRelsXml = docRelsXml.replace(
    "</Relationships>",
    `<Relationship Id="${headerRelId}" Type="${HEADER_REL_TYPE}" Target="${headerFileName}"/></Relationships>`,
  );

  // headerReference must be the first child of sectPr per the OOXML
  // schema's element sequence — inserting right after the opening tag
  // (before pgSz/pgMar/etc.) is the schema-correct position, not an
  // arbitrary choice. "first" is added alongside "default" so the
  // letterhead still shows even if the template has "Different First
  // Page" enabled (w:titlePg) — harmless, ignored by Word otherwise.
  const headerReferenceTags = `<w:headerReference w:type="default" r:id="${headerRelId}"/><w:headerReference w:type="first" r:id="${headerRelId}"/>`;
  let newDocumentXml: string;
  if (sectPrMatch) {
    const [fullMatch, attrs, selfClosing] = sectPrMatch;
    const replacement =
      selfClosing === "/" ? `<w:sectPr${attrs ?? ""}>${headerReferenceTags}</w:sectPr>` : `${fullMatch}${headerReferenceTags}`;
    newDocumentXml = documentXml.replace(fullMatch, replacement);
  } else {
    // No sectPr at all — append a minimal one as the last child of
    // <w:body>, the schema-correct position for a single-section document.
    newDocumentXml = documentXml.replace("</w:body>", `<w:sectPr>${headerReferenceTags}</w:sectPr></w:body>`);
  }

  zip.file("word/document.xml", newDocumentXml);
  zip.file(docRelsPath, newDocRelsXml);
  zip.file(`word/${headerFileName}`, headerXml);
  zip.file(`word/_rels/${headerFileName}.rels`, headerRelsXml);
  zip.file("[Content_Types].xml", contentTypesXml);

  return zip.generate({ type: "nodebuffer" });
}
