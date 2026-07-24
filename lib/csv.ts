// A minimal RFC4180-respecting CSV parser — handles quoted fields with
// embedded commas/newlines and doubled-quote escaping, and both CRLF/LF
// line endings. Mirrors this codebase's existing hand-rolled CSV *writing*
// convention (escapeCsvCell in app/api/employees/export/route.ts) rather
// than adding a parsing dependency — real HR data plausibly has commas
// inside fields (e.g. "Manager, Sales"), so a naive split(",") isn't safe.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  function pushField() {
    row.push(field);
    field = "";
  }
  function pushRow() {
    pushField();
    rows.push(row);
    row = [];
  }

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      pushRow();
      i += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) pushRow();

  // Drop a trailing fully-empty row (a trailing newline at EOF produces one).
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
