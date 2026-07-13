import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";

// Templates use {{variable_name}} placeholders, plus docxtemplater's native
// section syntax: {{#name}}...{{/name}} (loop over an array, or show once if
// truthy) and {{^name}}...{{/name}} (show only if falsy — an "else"/inverted
// section), plus the image module's own tag syntax {{%name}} (image) and
// {{%%name}} (centered image) inside our {{ }} delimiters. Detection reads
// the raw document XML and regex-matches tags rather than fully rendering
// with docxtemplater, since we only need the variable/section/image names here.
const TAG_PATTERN = /\{\{\s*(%%|%|[#^/])?\s*([\w.]+)\s*\}\}/g;

export type DetectedSection = {
  key: string;
  /** Best guess only — the template editor lets the admin override this. */
  kind: "conditional" | "repeating";
  columns: string[];
};

export type DetectedTemplateVariables = {
  flatFields: string[];
  sections: DetectedSection[];
  images: string[];
};

export function extractTemplateVariables(buffer: Buffer): DetectedTemplateVariables {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    throw new Error("Could not read file — is it a valid .docx?");
  }

  const documentXml = zip.file("word/document.xml");
  if (!documentXml) {
    throw new Error("Not a valid .docx file (missing word/document.xml)");
  }

  const text = documentXml.asText().replace(/<[^>]+>/g, "");

  type TagMatch = { prefix: string; key: string; start: number; end: number };
  const tags: TagMatch[] = [];
  for (const match of text.matchAll(TAG_PATTERN)) {
    const start = match.index ?? 0;
    tags.push({ prefix: match[1], key: match[2], start, end: start + match[0].length });
  }

  const flatFields = new Set<string>();
  const images = new Set<string>();
  const sections: DetectedSection[] = [];
  const openStack: TagMatch[] = [];

  for (const tag of tags) {
    if (tag.prefix === "%" || tag.prefix === "%%") {
      images.add(tag.key);
    } else if (tag.prefix === "#" || tag.prefix === "^") {
      openStack.push(tag);
    } else if (tag.prefix === "/") {
      const open = openStack.pop();
      if (!open || open.key !== tag.key) continue; // unbalanced/mismatched — best-effort detection, skip rather than throw
      const innerText = text.slice(open.end, tag.start);
      const columns = Array.from(new Set(Array.from(innerText.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)).map((m) => m[1])));
      sections.push({
        key: open.key,
        kind: open.prefix === "^" ? "conditional" : columns.length > 0 ? "repeating" : "conditional",
        columns,
      });
    } else if (openStack.length === 0) {
      // Only counts as a flat field if not nested inside an open section —
      // nested vars are that section's own columns, tracked separately above.
      flatFields.add(tag.key);
    }
  }

  return { flatFields: Array.from(flatFields), sections, images: Array.from(images) };
}

export type TemplateImageValue = { buffer: Buffer; width: number; height: number };

// Merges resolved field values into a template, producing the final .docx.
// Flat fields are plain strings; a "table" field's value is an array of row
// objects (repeated inside its {{#section}} loop); a "conditional" field's
// value is a boolean. Callers are responsible for formatting numbers/dates
// into strings before calling this. `images`, keyed by field name, supplies
// the raw bytes + target size for any {{%name}}/{{%%name}} image tags — the
// image module's getImage/getSize run synchronously during doc.render(), so
// the bytes must already be in hand (fetched from Blob storage by the
// caller), not lazily resolved here.
export function renderTemplate(
  buffer: Buffer,
  values: Record<string, string | boolean | Array<Record<string, string>>>,
  images?: Record<string, TemplateImageValue>,
): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    throw new Error("Could not read template file");
  }

  const modules =
    images && Object.keys(images).length > 0
      ? [
          new ImageModule({
            centered: false,
            fileType: "docx",
            getImage: (_tagValue: string, tagName: string) => {
              const image = images[tagName];
              if (!image) throw new Error(`No image provided for field "${tagName}"`);
              return image.buffer;
            },
            getSize: (_img: Buffer | Uint8Array, _tagValue: string, tagName: string) => {
              const image = images[tagName];
              return [image?.width ?? 150, image?.height ?? 150];
            },
          }),
        ]
      : [];

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    modules,
  });

  doc.render(values);

  return doc.getZip().generate({ type: "nodebuffer" });
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Builds a minimal but valid .docx from plain-text paragraphs (used by the
// seed script so seeded templates are real, openable files rather than
// dangling paths — not for production document generation).
export function createSimpleDocx(paragraphs: string[]): Buffer {
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(p)}</w:t></w:r></w:p>`)
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES_XML);
  zip.file("_rels/.rels", RELS_XML);
  zip.file("word/document.xml", documentXml);

  return zip.generate({ type: "nodebuffer" });
}
