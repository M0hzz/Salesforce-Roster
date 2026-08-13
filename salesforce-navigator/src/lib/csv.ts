// Minimal CSV/TSV parser that supports quoted fields with embedded
// commas and newlines. Auto-detects tab vs comma delimiter so pasted
// data from Excel works transparently.
export function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        /* skip — handled by the \n branch */
      } else field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/** Turn a header row + body rows into objects, trimming header whitespace. */
export function rowsToObjects<T>(rows: string[][]): T[] {
  if (rows.length < 2) return [];
  const [header, ...body] = rows;
  const keys = header.map((h) => h.trim());
  return body.map(
    (r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])) as T
  );
}
