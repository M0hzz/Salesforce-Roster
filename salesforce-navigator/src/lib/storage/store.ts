import type { ActivityRow, NewActivityRow, Person } from "@/lib/types";

export type BackendKind = "local" | "sharepoint";

/**
 * A storage backend for the app's two datasets. Implementations return the
 * canonical rows (with server-assigned ids where relevant) so the UI state
 * always mirrors what the backend actually holds.
 */
export interface DataStore {
  readonly kind: BackendKind;
  loadAll(): Promise<{ roster: Person[]; activity: ActivityRow[] }>;
  /** Replace the entire roster with these rows. */
  replaceRoster(rows: Person[]): Promise<Person[]>;
  /** Add activity rows; returns them with their final ids. */
  addActivity(rows: NewActivityRow[]): Promise<ActivityRow[]>;
  /** Replace all activity rows. */
  replaceActivity(rows: NewActivityRow[]): Promise<ActivityRow[]>;
  updateActivity(id: string, patch: Partial<ActivityRow>): Promise<void>;
  clearAll(): Promise<void>;
}

const BACKEND_KEY = "storage-backend";

export function readBackendChoice(): BackendKind {
  try {
    return localStorage.getItem(BACKEND_KEY) === "sharepoint" ? "sharepoint" : "local";
  } catch {
    return "local";
  }
}

export function saveBackendChoice(kind: BackendKind): void {
  try {
    localStorage.setItem(BACKEND_KEY, kind);
  } catch {
    /* private mode — the choice just won't persist */
  }
}
