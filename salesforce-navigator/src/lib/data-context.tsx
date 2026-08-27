import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { SAMPLE_ACTIVITY, SAMPLE_ROSTER } from "./sample-data";
import type { ActivityRow, NewActivityRow, Person } from "./types";
import { readBackendChoice, saveBackendChoice, type BackendKind, type DataStore } from "./storage/store";
import { LocalStore } from "./storage/local-store";
import { SharePointStore } from "./storage/sharepoint-store";
import { isSharePointConfigured } from "./sharepoint/config";
import * as spAuth from "./sharepoint/auth";

export type { ActivityRow, Person } from "./types";

export type ConnectionStatus =
  | "ready" // local backend — always available
  | "unconfigured" // sharepoint chosen but env vars missing
  | "signed-out"
  | "connecting"
  | "connected"
  | "error";

type Ctx = {
  roster: Person[];
  activity: ActivityRow[];
  backend: BackendKind;
  setBackend: (kind: BackendKind) => void;
  status: ConnectionStatus;
  lastError: string | null;
  loading: boolean;
  accountName: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setRoster: (rows: Person[]) => Promise<void>;
  appendActivity: (rows: NewActivityRow[]) => Promise<number>;
  updateActivity: (id: string, patch: Partial<ActivityRow>) => void;
  loadSample: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const DataCtx = createContext<Ctx | null>(null);

const NOTE_FLUSH_MS = 700;

export function DataProvider({ children }: { children: ReactNode }) {
  const [backend, setBackendState] = useState<BackendKind>(() => readBackendChoice());
  const [roster, setRosterState] = useState<Person[]>([]);
  const [activity, setActivityState] = useState<ActivityRow[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("ready");
  const [lastError, setLastError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState<string | null>(null);

  const store: DataStore = useMemo(
    () => (backend === "sharepoint" ? new SharePointStore() : new LocalStore()),
    [backend]
  );

  // Debounced per-item patches so inline note editing doesn't become a
  // network write per keystroke against SharePoint.
  const pendingPatches = useRef(new Map<string, Partial<ActivityRow>>());
  const patchTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const fail = useCallback((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    setLastError(message);
    if (backend === "sharepoint") setStatus("error");
  }, [backend]);

  const flushPatch = useCallback(
    (id: string) => {
      const timer = patchTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        patchTimers.current.delete(id);
      }
      const patch = pendingPatches.current.get(id);
      if (!patch) return;
      pendingPatches.current.delete(id);
      store.updateActivity(id, patch).catch(fail);
    },
    [store, fail]
  );

  const flushAllPatches = useCallback(() => {
    for (const id of Array.from(pendingPatches.current.keys())) flushPatch(id);
  }, [flushPatch]);

  useEffect(() => {
    window.addEventListener("pagehide", flushAllPatches);
    return () => window.removeEventListener("pagehide", flushAllPatches);
  }, [flushAllPatches]);

  const load = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    try {
      if (store.kind === "sharepoint") {
        if (!isSharePointConfigured()) {
          setStatus("unconfigured");
          setRosterState([]);
          setActivityState([]);
          return;
        }
        setStatus("connecting");
        const account = await spAuth.restoreSession();
        setAccountName(account?.name ?? account?.username ?? null);
        if (!account) {
          setStatus("signed-out");
          setRosterState([]);
          setActivityState([]);
          return;
        }
        const data = await store.loadAll();
        setRosterState(data.roster);
        setActivityState(data.activity);
        setStatus("connected");
      } else {
        const data = await store.loadAll();
        setRosterState(data.roster);
        setActivityState(data.activity);
        setStatus("ready");
      }
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [store, fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const setBackend = useCallback(
    (kind: BackendKind) => {
      flushAllPatches();
      saveBackendChoice(kind);
      setBackendState(kind);
    },
    [flushAllPatches]
  );

  const signIn = useCallback(async () => {
    try {
      setLastError(null);
      setStatus("connecting");
      const account = await spAuth.signIn();
      setAccountName(account.name ?? account.username ?? null);
      const data = await store.loadAll();
      setRosterState(data.roster);
      setActivityState(data.activity);
      setStatus("connected");
    } catch (e) {
      fail(e);
      throw e;
    }
  }, [store, fail]);

  const signOut = useCallback(async () => {
    flushAllPatches();
    try {
      await spAuth.signOut();
    } catch {
      /* popup closed — treat as signed out locally */
    }
    setAccountName(null);
    setRosterState([]);
    setActivityState([]);
    setStatus("signed-out");
  }, [flushAllPatches]);

  const setRoster = useCallback(
    async (rows: Person[]) => {
      setRosterState(rows); // optimistic
      try {
        await store.replaceRoster(rows);
      } catch (e) {
        fail(e);
        throw e;
      }
    },
    [store, fail]
  );

  const appendActivity = useCallback(
    async (rows: NewActivityRow[]) => {
      try {
        const created = await store.addActivity(rows);
        setActivityState((prev) => [...prev, ...created]);
        return created.length;
      } catch (e) {
        fail(e);
        throw e;
      }
    },
    [store, fail]
  );

  const updateActivity = useCallback(
    (id: string, patch: Partial<ActivityRow>) => {
      setActivityState((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      pendingPatches.current.set(id, { ...pendingPatches.current.get(id), ...patch });
      const existing = patchTimers.current.get(id);
      if (existing) clearTimeout(existing);
      patchTimers.current.set(
        id,
        setTimeout(() => flushPatch(id), NOTE_FLUSH_MS)
      );
    },
    [flushPatch]
  );

  const clearAll = useCallback(async () => {
    setRosterState([]);
    setActivityState([]);
    try {
      await store.clearAll();
    } catch (e) {
      fail(e);
      throw e;
    }
  }, [store, fail]);

  const loadSample = useCallback(async () => {
    try {
      const roster = await store.replaceRoster(SAMPLE_ROSTER);
      const activity = await store.replaceActivity(SAMPLE_ACTIVITY);
      setRosterState(roster);
      setActivityState(activity);
    } catch (e) {
      fail(e);
      throw e;
    }
  }, [store, fail]);

  return (
    <DataCtx.Provider
      value={{
        roster,
        activity,
        backend,
        setBackend,
        status,
        lastError,
        loading,
        accountName,
        signIn,
        signOut,
        refresh: load,
        setRoster,
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
