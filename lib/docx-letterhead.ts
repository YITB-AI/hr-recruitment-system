import PizZip from "pizzip";

// Auto-injects a logo + company-info header into a .docx template IN
// MEMORY at generation time, so every generated document carries the
// company's letterhead without an admin ever having to edit the template
// file itself in Word.
//
// Does NOT reuse docxtemplater-image-module-free's {{%tag}} mechanism —
// confirmed by direct testing that this free fork only wires up image
// substitution for the document BODY, silently leaving an empty run for
// an image tag placed inside a header/footer part (no error, no image).
// Instead this hand-builds the final drawing/media/relationship XML
// directly at injection time, with the real logo bytes and real
// name/address text already baked in — no docxtemplater render pass
// touches the header at all.

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

// 9525 EMU per pixel at 96 DPI — the standard OOXML drawingml conversion.
// ~1.6in x 0.5in, sized to sit comfortably above a one-page HR letter
// without crowding the body.
const EMU_PER_PX = 9525;
export const LETTERHEAD_LOGO_WIDTH_EMU = 150 * EMU_PER_PX;
export const LETTERHEAD_LOGO_HEIGHT_EMU = 50 * EMU_PER_PX;

export type LetterheadLogo = { buffer: Buffer; extension: string };

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
  while (zip.file(`word/media/letterhead_logo${n}.${extension}`)) n++;
  return `letterhead_logo${n}.${extension}`;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildDrawingXml(relId: string): string {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${LETTERHEAD_LOGO_WIDTH_EMU}" cy="${LETTERHEAD_LOGO_HEIGHT_EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Letterhead Logo" descr="Letterhead Logo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Letterhead Logo"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${LETTERHEAD_LOGO_WIDTH_EMU}" cy="${LETTERHEAD_LOGO_HEIGHT_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
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
 * `<w:sectPr>` at all — confirmed to be the common case for this app's
 * own seed/test-script-authored templates, as opposed to genuine
 * Word-saved files, which always have one — a minimal one (just the
 * headerReference; Word supplies its own defaults for pgSz/pgMar/etc.,
 * all of which are optional per the OOXML schema) is appended as the
 * last child of `<w:body>`, which is also schema-correct.
 *
 * `logo` is optional — when omitted, only the text (company name/
 * address) is injected, right-aligned in the header, no image.
 */
export function injectLetterheadHeader(buffer: Buffer, logo: LetterheadLogo | null, text: string): Buffer {
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

  const docRelsPath = "word/_rels/document.xml.rels";
  const docRelsFile = zip.file(docRelsPath);
  const docRelsXml =
    docRelsFile?.asText() ??
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  if (docRelsXml.includes(HEADER_REL_TYPE)) return buffer;

  const sectPrMatch = documentXml.match(/<w:sectPr(\s[^>]*)?(\/?)>/);
  const hasSectPr = sectPrMatch !== null;
  if (!hasSectPr && !documentXml.includes("</w:body>")) return buffer; // not a readable document body at all

  const headerFileName = nextFreeHeaderFileName(zip);
  const headerRelId = nextFreeRelId(docRelsXml);

  let contentTypesXml = contentTypesFile.asText();
  if (!contentTypesXml.includes(`/word/${headerFileName}`)) {
    contentTypesXml = contentTypesXml.replace(
      "</Types>",
      `<Override PartName="/word/${headerFileName}" ContentType="${HEADER_CONTENT_TYPE}"/></Types>`,
    );
  }

  // Header rels are scoped to the header part alone (rIds restart at 1
  // there, independent of document.xml.rels), so this is always the
  // logo's relationship id when a logo is present.
  const headerRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${
    logo ? `<Relationship Id="rId1" Type="${IMAGE_REL_TYPE}" Target="media/${nextFreeMediaFileName(zip, logo.extension)}"/>` : ""
  }</Relationships>`;

  let drawingXml = "";
  if (logo) {
    const contentType = EXTENSION_CONTENT_TYPES[logo.extension.toLowerCase()] ?? "image/png";
    if (!contentTypesXml.includes(`Extension="${logo.extension}"`)) {
      contentTypesXml = contentTypesXml.replace(
        "</Types>",
        `<Default Extension="${logo.extension}" ContentType="${contentType}"/></Types>`,
      );
    }
    const mediaFileName = nextFreeMediaFileName(zip, logo.extension);
    zip.file(`word/media/${mediaFileName}`, logo.buffer, { binary: true });
    drawingXml = buildDrawingXml("rId1");
  }

  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:p>
    <w:pPr><w:tabs><w:tab w:val="right" w:pos="9000"/></w:tabs></w:pPr>
    <w:r>${drawingXml}</w:r>
    <w:r><w:tab/><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="AAAAAA"/></w:pBdr></w:pPr></w:p>
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
