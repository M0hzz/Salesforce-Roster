import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SAMPLE_ACTIVITY, SAMPLE_ROSTER } from "./sample-data";

export type Person = {
  "Title Code": string;
  "Full Name": string;
  Phone?: string;
  Email?: string;
  "Reports To"?: string;
  Department?: string;
  Region?: string;
  Level?: string;
};

export type ActivityRow = {
  id: string;
  Status?: string;
  Title?: string;
  RetailerId?: string;
  "Application Date"?: string;
  "Scheduled Date"?: string;
  Address?: string;
  Route?: string;
  Task?: string;
  Model?: string;
  Brand?: string;
  Area?: string;
  Phone?: string;
  Notes?: string;
  "More Notes"?: string;
};

type Ctx = {
  roster: Person[];
  activity: ActivityRow[];
  setRoster: (rows: Person[]) => void;
  setActivity: (rows: ActivityRow[]) => void;
  appendActivity: (rows: ActivityRow[]) => void;
  updateActivity: (id: string, patch: Partial<ActivityRow>) => void;
  loadSample: () => void;
  clearAll: () => void;
};

const DataCtx = createContext<Ctx | null>(null);

function readStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [roster, setRosterState] = useState<Person[]>(() => readStore<Person>("roster"));
  const [activity, setActivityState] = useState<ActivityRow[]>(() =>
    readStore<ActivityRow>("activity")
  );

  useEffect(() => {
    localStorage.setItem("roster", JSON.stringify(roster));
  }, [roster]);
  useEffect(() => {
    localStorage.setItem("activity", JSON.stringify(activity));
  }, [activity]);

  const setRoster = (rows: Person[]) => setRosterState(rows);
  const setActivity = (rows: ActivityRow[]) => setActivityState(rows);
  const appendActivity = (rows: ActivityRow[]) => setActivityState((prev) => [...prev, ...rows]);
  const updateActivity = (id: string, patch: Partial<ActivityRow>) =>
    setActivityState((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const clearAll = () => {
    setRosterState([]);
    setActivityState([]);
  };
  const loadSample = () => {
    setRosterState(SAMPLE_ROSTER);
    setActivityState(SAMPLE_ACTIVITY.map((r, i) => ({ ...r, id: `sample-${i}` })));
  };

  return (
    <DataCtx.Provider
      value={{
        roster,
        activity,
        setRoster,
        setActivity,
        appendActivity,
        updateActivity,
        loadSample,
        clearAll,
      }}
    >
      {children}
    </DataCtx.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

// Normalize route to auto-prefix bare 3-digit codes with 'S'.
export function normalizeRoute(route: string | undefined): string {
  const r = (route || "").trim();
  if (/^\d{3}$/.test(r)) return "S" + r;
  return r;
}

export function personForActivity(row: ActivityRow, roster: Person[]): Person | undefined {
  const key = normalizeRoute(row.Route).toUpperCase();
  if (!key) return undefined;
  return roster.find((p) => (p["Title Code"] || "").toUpperCase() === key);
}

/** Everyone reporting into a person, at any depth. */
export function descendantsOf(code: string, roster: Person[]): Person[] {
  const out: Person[] = [];
  const queue = [code];
  const seen = new Set<string>([code]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const p of roster) {
      if (p["Reports To"] === cur && !seen.has(p["Title Code"])) {
        seen.add(p["Title Code"]);
        out.push(p);
        queue.push(p["Title Code"]);
      }
    }
  }
  return out;
}
