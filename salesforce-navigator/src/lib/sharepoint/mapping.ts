import schema from "./lists.schema.json";

export type FieldDef = {
  app: string;
  sp: string;
  type: "text" | "note" | "date";
  required?: boolean;
  indexed?: boolean;
  unique?: boolean;
  note?: string;
};

export type ListDef = {
  listName: string;
  description: string;
  fields: FieldDef[];
};

export const ROSTER_DEF = schema.roster as ListDef;
export const ACTIVITY_DEF = schema.activity as ListDef;

export function spFieldNames(def: ListDef): string[] {
  return def.fields.map((f) => f.sp);
}

/** App date strings are YYYY-MM-DD; Graph date columns want the same or full ISO. */
function toSpValue(field: FieldDef, value: string): string {
  if (field.type === "date") {
    const v = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const parsed = new Date(v);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return value;
}

/** Graph returns date-only columns as ISO datetimes; give the app back YYYY-MM-DD. */
function fromSpValue(field: FieldDef, value: unknown): string {
  const s = String(value);
  if (field.type === "date") {
    const m = s.match(/^\d{4}-\d{2}-\d{2}/);
    if (m) return m[0];
  }
  return s;
}

/**
 * Map an app row (or partial patch) onto SharePoint field names. Only keys
 * present on the input are emitted, so a partial patch stays partial.
 */
export function toSpFields(def: ListDef, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of def.fields) {
    if (!(field.app in row)) continue;
    const value = row[field.app];
    if (value === undefined) continue;
    if (value === null || value === "") {
      out[field.sp] = null;
    } else {
      out[field.sp] = toSpValue(field, String(value));
    }
  }
  return out;
}

export function fromSpFields<T extends Record<string, unknown>>(
  def: ListDef,
  fields: Record<string, unknown>
): T {
  const out: Record<string, unknown> = {};
  for (const field of def.fields) {
    const value = fields[field.sp];
    if (value === undefined || value === null) continue;
    out[field.app] = fromSpValue(field, value);
  }
  return out as T;
}
