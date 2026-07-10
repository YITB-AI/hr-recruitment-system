import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

// Templates use {{variable_name}} placeholders. Detection reads the raw
// document XML and regex-matches tags rather than fully rendering with
// docxtemplater, since we only need the variable names here — actual
// generation (merging real data into the template) is a later step and will
// reuse the same {{ }} delimiter convention.
const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

export function extractTemplateVariables(buffer: Buffer): string[] {
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
  const found = new Set<string>();

  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    found.add(match[1]);
  }

  return Array.from(found);
}

// Merges resolved field values into a template, producing the final .docx.
// Values are plain strings — callers are responsible for formatting numbers/
// dates before calling this.
export function renderTemplate(buffer: Buffer, values: Record<string, string>): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    throw new Error("Could not read template file");
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
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
