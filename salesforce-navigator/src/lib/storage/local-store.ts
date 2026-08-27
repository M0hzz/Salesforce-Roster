import type { ActivityRow, NewActivityRow, Person } from "@/lib/types";
import type { DataStore } from "./store";

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, rows: unknown[]): void {
  localStorage.setItem(key, JSON.stringify(rows));
}

function newId(i: number): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${base}-${i}`;
}

/** The original browser-only backend: everything lives in localStorage. */
export class LocalStore implements DataStore {
  readonly kind = "local" as const;

  async loadAll() {
    return { roster: read<Person>("roster"), activity: read<ActivityRow>("activity") };
  }

  async replaceRoster(rows: Person[]) {
    write("roster", rows);
    return rows;
  }

  async addActivity(rows: NewActivityRow[]) {
    const withIds = rows.map((r, i) => ({ ...r, id: newId(i) }));
    write("activity", [...read<ActivityRow>("activity"), ...withIds]);
    return withIds;
  }

  async replaceActivity(rows: NewActivityRow[]) {
    const withIds = rows.map((r, i) => ({ ...r, id: newId(i) }));
    write("activity", withIds);
    return withIds;
  }

  async updateActivity(id: string, patch: Partial<ActivityRow>) {
    write(
      "activity",
      read<ActivityRow>("activity").map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  async clearAll() {
    write("roster", []);
    write("activity", []);
  }
}
