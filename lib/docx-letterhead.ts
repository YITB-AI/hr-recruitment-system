import PizZip from "pizzip";
import { getImageDimensions } from "@/lib/image-dimensions";

// Auto-injects a company-uploaded letterhead IMAGE into a .docx template's
// Word header, IN MEMORY at generation time, so every generated document
// carries it without an admin ever having to edit the template file itself.
// The uploaded image is a COMPLETE, pre-designed letterhead (logo + name +
// address + whatever decoration, however the admin designed it) — this
// embeds it as-is. No separate logo/text composition; the admin's own image
// already carries whatever branding it needs.
//
// Renders as a full-page BACKGROUND behind the body text (matching how this
// company's own pre-existing "Conformation Letter" template achieves the
// exact same look) — not a small banner at the top. An earlier version fit
// the image to a max ~1.5in-tall inline banner; that was the right fix for
// an *inline* (flow) drawing (an 8.4in-tall inline image pushed body text
// almost entirely off page 1), but the actual desired look is a page-
// spanning watermark/background with text flowing normally on top of it —
// which requires an ANCHORED drawing positioned relative to the page with
// behindDoc="1", not a taller inline one.
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

// 914400 EMU = 1 inch. US Letter — matches this company's own real
// templates (confirmed directly: the pre-existing Conformation Letter
// template's own baked-in header image is ~8.6in x 11.18in, i.e. Letter,
// not A4).
const PAGE_WIDTH_IN = 8.5;
const PAGE_HEIGHT_IN = 11;
const PAGE_WIDTH_EMU = Math.round(PAGE_WIDTH_IN * 914400);
const PAGE_HEIGHT_EMU = Math.round(PAGE_HEIGHT_IN * 914400);
const PAGE_ASPECT_RATIO = PAGE_WIDTH_IN / PAGE_HEIGHT_IN;

/**
 * Full-page display size, shared so the letterhead renders at the IDENTICAL
 * size in both the real .docx (via injectLetterheadHeader) and the PDF
 * preview (via lib/pdf-conversion.ts, which can't read the .docx header at
 * all — see that file's comment — so it needs the same numbers independently).
 */
export function getLetterheadDisplaySizeInches(): { widthIn: number; heightIn: number } {
  return { widthIn: PAGE_WIDTH_IN, heightIn: PAGE_HEIGHT_IN };
}

/**
 * Fractions (0-1) to crop from each edge of the SOURCE image so the
 * remaining region's aspect ratio exactly matches the page's — emulating
 * CSS `object-fit: cover`. The image fills the full page with no
 * letterboxing; excess is cropped from whichever dimension is relatively
 * longer than the page's own proportions, rather than stretching/distorting
 * the image to fit.
 */
function computeCoverCrop(aspectRatio: number): { l: number; t: number; r: number; b: number } {
  if (aspectRatio > PAGE_ASPECT_RATIO) {
    // Source is relatively wider than the page — crop left/right.
    const keepWidthFraction = PAGE_ASPECT_RATIO / aspectRatio;
    const cropEachSide = (1 - keepWidthFraction) / 2;
    return { l: cropEachSide, r: cropEachSide, t: 0, b: 0 };
  }
  // Source is relatively taller than the page (or already matches) — crop top/bottom.
  const keepHeightFraction = aspectRatio / PAGE_ASPECT_RATIO;
  const cropEachSide = (1 - keepHeightFraction) / 2;
  return { l: 0, r: 0, t: cropEachSide, b: cropEachSide };
}

// OOXML ST_Percentage: 100% = 100000 units.
function toSrcRectPercent(fraction: number): number {
  return Math.round(fraction * 100000);
}

// A full-page letterhead image almost always has its own baked-in header
// band (logo/company name) and often a footer bar too — real body text
// must start below/end above those, or the two visually collide (confirmed
// directly: a real generated document showed the recipient's name line
// rendering on top of the letterhead's own title text). There's no way to
// detect an arbitrary uploaded image's actual "safe zone" automatically, so
// this is an admin-tunable per-letterhead setting (see models/Letterhead.ts)
// with conservative defaults sized to clear a typical logo/title header and
// a typical contact-info footer bar.
export const DEFAULT_CONTENT_TOP_MARGIN_IN = 2;
export const DEFAULT_CONTENT_BOTTOM_MARGIN_IN = 1.5;

const TWIPS_PER_INCH = 1440;
const DEFAULT_SIDE_MARGIN_TWIPS = TWIPS_PER_INCH; // 1in — Word's own ordinary default.

export type LetterheadImage = {
  buffer: Buffer;
  extension: string;
  contentTopMarginIn?: number;
  contentBottomMarginIn?: number;
};

function twipsFromInches(inches: number): number {
  return Math.round(inches * TWIPS_PER_INCH);
}

function buildPgMarXml(topTwips: number, bottomTwips: number): string {
  return `<w:pgMar w:top="${topTwips}" w:right="${DEFAULT_SIDE_MARGIN_TWIPS}" w:bottom="${bottomTwips}" w:left="${DEFAULT_SIDE_MARGIN_TWIPS}" w:header="720" w:footer="720" w:gutter="0"/>`;
}

// Never SHRINKS a margin the template's own author already set larger than
// what the letterhead needs — only raises it to at least clear the
// letterhead's header/footer bands. Operates on a sectPr's inner XML (the
// content between <w:sectPr...> and </w:sectPr>), not the whole document.
function enforceMinimumPageMargins(sectPrInnerXml: string, topTwips: number, bottomTwips: number): string {
  const pgMarMatch = sectPrInnerXml.match(/<w:pgMar([^/>]*)\/>/);
  if (!pgMarMatch) return sectPrInnerXml + buildPgMarXml(topTwips, bottomTwips);

  const [fullMatch, attrs] = pgMarMatch;
  const existingTop = Number(attrs.match(/w:top="(\d+)"/)?.[1] ?? 0);
  const existingBottom = Number(attrs.match(/w:bottom="(\d+)"/)?.[1] ?? 0);
  const newTop = Math.max(existingTop, topTwips);
  const newBottom = Math.max(existingBottom, bottomTwips);

  let newAttrs = attrs.includes("w:top=") ? attrs.replace(/w:top="\d+"/, `w:top="${newTop}"`) : `${attrs} w:top="${newTop}"`;
  newAttrs = newAttrs.includes("w:bottom=") ? newAttrs.replace(/w:bottom="\d+"/, `w:bottom="${newBottom}"`) : `${newAttrs} w:bottom="${newBottom}"`;

  return sectPrInnerXml.replace(fullMatch, `<w:pgMar${newAttrs}/>`);
}

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

// Anchored (not inline) so the image is positioned relative to the PAGE and
// rendered behindDoc="1" — this is what lets it span the full page as a
// watermark/background with body text flowing normally on top of it,
// exactly matching how the pre-existing Conformation Letter template's own
// baked-in header achieves the same look. wrapNone means body text never
// reflows around it (it's behind everything, so there's nothing to wrap).
function buildBackgroundDrawingXml(relId: string, crop: { l: number; t: number; r: number; b: number }): string {
  const srcRect = `<a:srcRect l="${toSrcRectPercent(crop.l)}" t="${toSrcRectPercent(crop.t)}" r="${toSrcRectPercent(crop.r)}" b="${toSrcRectPercent(crop.b)}"/>`;
  return `<w:drawing><wp:anchor behindDoc="1" distT="0" distB="0" distL="0" distR="0" simplePos="0" locked="0" layoutInCell="1" allowOverlap="1" relativeHeight="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${PAGE_WIDTH_EMU}" cy="${PAGE_HEIGHT_EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="1" name="Letterhead" descr="Letterhead"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Letterhead"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/>${srcRect}<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${PAGE_WIDTH_EMU}" cy="${PAGE_HEIGHT_EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>`;
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

  const dimensions = getImageDimensions(letterhead.buffer);
  const aspectRatio = dimensions && dimensions.width > 0 ? dimensions.width / dimensions.height : PAGE_ASPECT_RATIO;
  const crop = computeCoverCrop(aspectRatio);

  const mediaFileName = nextFreeMediaFileName(zip, extension);
  zip.file(`word/media/${mediaFileName}`, letterhead.buffer, { binary: true });

  const headerRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${IMAGE_REL_TYPE}" Target="media/${mediaFileName}"/></Relationships>`;

  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${buildBackgroundDrawingXml("rId1", crop)}</w:r></w:p>
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
  const topTwips = twipsFromInches(letterhead.contentTopMarginIn ?? DEFAULT_CONTENT_TOP_MARGIN_IN);
  const bottomTwips = twipsFromInches(letterhead.contentBottomMarginIn ?? DEFAULT_CONTENT_BOTTOM_MARGIN_IN);

  // Self-closing sectPr (<w:sectPr .../>) has no children to search for an
  // existing pgMar in — trivial case, just add one. A non-self-closing
  // sectPr's full inner content (up to its matching close tag) is searched/
  // patched by enforceMinimumPageMargins so an existing pgMar is raised,
  // never replaced wholesale (preserving any larger margin already set).
  const selfClosingSectPrMatch = documentXml.match(/<w:sectPr(\s[^>]*)?\/>/);
  const openSectPrMatch = !selfClosingSectPrMatch ? documentXml.match(/<w:sectPr(\s[^>]*)?>([\s\S]*?)<\/w:sectPr>/) : null;

  let newDocumentXml: string;
  if (selfClosingSectPrMatch) {
    const [fullMatch, attrs] = selfClosingSectPrMatch;
    const inner = headerReferenceTags + buildPgMarXml(topTwips, bottomTwips);
    newDocumentXml = documentXml.replace(fullMatch, `<w:sectPr${attrs ?? ""}>${inner}</w:sectPr>`);
  } else if (openSectPrMatch) {
    const [fullMatch, attrs, innerContent] = openSectPrMatch;
    const updatedInner = enforceMinimumPageMargins(innerContent, topTwips, bottomTwips);
    newDocumentXml = documentXml.replace(fullMatch, `<w:sectPr${attrs ?? ""}>${headerReferenceTags}${updatedInner}</w:sectPr>`);
  } else {
    // No sectPr at all — append a minimal one as the last child of
    // <w:body>, the schema-correct position for a single-section document.
    newDocumentXml = documentXml.replace(
      "</w:body>",
      `<w:sectPr>${headerReferenceTags}${buildPgMarXml(topTwips, bottomTwips)}</w:sectPr></w:body>`,
    );
  }

  zip.file("word/document.xml", newDocumentXml);
  zip.file(docRelsPath, newDocRelsXml);
  zip.file(`word/${headerFileName}`, headerXml);
  zip.file(`word/_rels/${headerFileName}.rels`, headerRelsXml);
  zip.file("[Content_Types].xml", contentTypesXml);

  return zip.generate({ type: "nodebuffer" });
}
