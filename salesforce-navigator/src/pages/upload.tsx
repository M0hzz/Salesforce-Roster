import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useData } from "@/lib/data-context";
import type { NewActivityRow, Person } from "@/lib/types";
import { parseDelimited, rowsToObjects } from "@/lib/csv";

const ROSTER_REQUIRED = ["Title Code", "Full Name"];
const ACTIVITY_REQUIRED = ["Route"];

type Result = { ok: boolean; message: string } | null;

function missingColumns(rows: string[][], required: string[]): string[] {
  const header = (rows[0] ?? []).map((h) => h.trim());
  return required.filter((r) => !header.includes(r));
}

export default function UploadPage() {
  const { setRoster, appendActivity, loadSample, clearAll, roster, activity, backend } = useData();
  const [rosterPaste, setRosterPaste] = useState("");
  const [activityPaste, setActivityPaste] = useState("");
  const [rosterResult, setRosterResult] = useState<Result>(null);
  const [activityResult, setActivityResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const rosterFile = useRef<HTMLInputElement>(null);
  const activityFile = useRef<HTMLInputElement>(null);

  const sharePoint = backend === "sharepoint";

  const parseRoster = async (text: string) => {
    const rows = parseDelimited(text);
    if (rows.length < 2) {
      setRosterResult({ ok: false, message: "Need a header row and at least one person." });
      return;
    }
    const missing = missingColumns(rows, ROSTER_REQUIRED);
    if (missing.length) {
      setRosterResult({ ok: false, message: `Missing column: ${missing.join(", ")}` });
      return;
    }
    const people = rowsToObjects<Person>(rows).filter((p) => p["Title Code"]);
    setBusy(true);
    try {
      await setRoster(people);
      setRosterResult({ ok: true, message: `Replaced the roster with ${people.length} people.` });
    } catch (e) {
      setRosterResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const parseActivity = async (text: string) => {
    const rows = parseDelimited(text);
    if (rows.length < 2) {
      setActivityResult({ ok: false, message: "Need a header row and at least one row of work." });
      return;
    }
    const missing = missingColumns(rows, ACTIVITY_REQUIRED);
    if (missing.length) {
      setActivityResult({ ok: false, message: `Missing column: ${missing.join(", ")}` });
      return;
    }
    const rowsOut = rowsToObjects<NewActivityRow>(rows);
    setBusy(true);
    try {
      const added = await appendActivity(rowsOut);
      setActivityResult({ ok: true, message: `Added ${added} activity rows.` });
    } catch (e) {
      setActivityResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const readFile = (file: File | undefined, onText: (t: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="p-6 rounded-xl border bg-card space-y-3">
        <div>
          <h2 className="font-bold">Team roster</h2>
          <p className="text-sm text-muted-foreground">
            Uploading replaces everyone currently in the roster
            {sharePoint && " — in SharePoint, for the whole team"}. Needs{" "}
            <code className="text-xs">Title Code</code> and <code className="text-xs">Full Name</code>.
          </p>
        </div>
        <textarea
          value={rosterPaste}
          onChange={(e) => setRosterPaste(e.target.value)}
          className="w-full h-40 p-2 border rounded font-mono text-xs bg-background"
          placeholder="Paste from Excel…"
          aria-label="Roster data"
        />
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => void parseRoster(rosterPaste)}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Replace roster
          </button>
          <button
            disabled={busy}
            onClick={() => rosterFile.current?.click()}
            className="px-3 py-1.5 rounded border text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" /> Choose CSV file
          </button>
          <input
            ref={rosterFile}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) =>
              readFile(e.target.files?.[0], (t) => {
                setRosterPaste(t);
                void parseRoster(t);
              })
            }
          />
        </div>
        <Feedback result={rosterResult} />
        <div className="text-sm text-muted-foreground">{roster.length} people loaded</div>
      </section>

      <section className="p-6 rounded-xl border bg-card space-y-3">
        <div>
          <h2 className="font-bold">Sales activity</h2>
          <p className="text-sm text-muted-foreground">
            Uploading adds to what's already there. Needs a <code className="text-xs">Route</code>{" "}
            column so rows can find their rep.
          </p>
        </div>
        <textarea
          value={activityPaste}
          onChange={(e) => setActivityPaste(e.target.value)}
          className="w-full h-40 p-2 border rounded font-mono text-xs bg-background"
          placeholder="Paste from Excel…"
          aria-label="Activity data"
        />
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => void parseActivity(activityPaste)}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add activity
          </button>
          <button
            disabled={busy}
            onClick={() => activityFile.current?.click()}
            className="px-3 py-1.5 rounded border text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" /> Choose CSV file
          </button>
          <input
            ref={activityFile}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) =>
              readFile(e.target.files?.[0], (t) => {
                setActivityPaste(t);
                void parseActivity(t);
              })
            }
          />
        </div>
        <Feedback result={activityResult} />
        <div className="text-sm text-muted-foreground">{activity.length} activity rows loaded</div>
      </section>

      <div className="col-span-full flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => void loadSample().catch(() => {})}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-50"
        >
          Load sample data
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (sharePoint && !confirm("This deletes every item in both SharePoint lists, for everyone. Continue?")) {
              return;
            }
            void clearAll().catch(() => {});
            setRosterResult(null);
            setActivityResult(null);
          }}
          className="px-3 py-1.5 rounded border text-destructive text-sm disabled:opacity-50"
        >
          Clear all data
        </button>
        <p className="w-full text-xs text-muted-foreground">
          {sharePoint
            ? "Connected to SharePoint — uploads, edits, and deletes here change the shared lists for everyone on the site."
            : "Everything stays in this browser — nothing is sent anywhere. Switch to SharePoint on the Storage page to share data with your team."}
        </p>
      </div>
    </div>
  );
}

function Feedback({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <p
      className={
        "text-sm inline-flex items-start gap-1.5 " +
        (result.ok ? "text-muted-foreground" : "text-destructive")
      }
    >
      {result.ok ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      )}
      {result.message}
    </p>
  );
}
