import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp } from "lucide-react";
import { useData, type ActivityRow, type Person } from "@/lib/data-context";
import { parseDelimited, rowsToObjects } from "@/lib/csv";

const ROSTER_REQUIRED = ["Title Code", "Full Name"];
const ACTIVITY_REQUIRED = ["Route"];

type Result = { ok: boolean; message: string } | null;

function missingColumns(rows: string[][], required: string[]): string[] {
  const header = (rows[0] ?? []).map((h) => h.trim());
  return required.filter((r) => !header.includes(r));
}

function newId(i: number) {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${base}-${i}`;
}

export default function UploadPage() {
  const { setRoster, appendActivity, loadSample, clearAll, roster, activity } = useData();
  const [rosterPaste, setRosterPaste] = useState("");
  const [activityPaste, setActivityPaste] = useState("");
  const [rosterResult, setRosterResult] = useState<Result>(null);
  const [activityResult, setActivityResult] = useState<Result>(null);
  const rosterFile = useRef<HTMLInputElement>(null);
  const activityFile = useRef<HTMLInputElement>(null);

  const parseRoster = (text: string) => {
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
    setRoster(people);
    setRosterResult({ ok: true, message: `Replaced the roster with ${people.length} people.` });
  };

  const parseActivity = (text: string) => {
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
    const rowsOut = rowsToObjects<Omit<ActivityRow, "id">>(rows).map((r, i) => ({
      ...r,
      id: newId(i),
    }));
    appendActivity(rowsOut);
    setActivityResult({ ok: true, message: `Added ${rowsOut.length} activity rows.` });
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
            Uploading replaces everyone currently in the roster. Needs{" "}
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
            onClick={() => parseRoster(rosterPaste)}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm"
          >
            Replace roster
          </button>
          <button
            onClick={() => rosterFile.current?.click()}
            className="px-3 py-1.5 rounded border text-sm inline-flex items-center gap-1.5"
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
                parseRoster(t);
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
            onClick={() => parseActivity(activityPaste)}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm"
          >
            Add activity
          </button>
          <button
            onClick={() => activityFile.current?.click()}
            className="px-3 py-1.5 rounded border text-sm inline-flex items-center gap-1.5"
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
                parseActivity(t);
              })
            }
          />
        </div>
        <Feedback result={activityResult} />
        <div className="text-sm text-muted-foreground">{activity.length} activity rows loaded</div>
      </section>

      <div className="col-span-full flex flex-wrap gap-2">
        <button onClick={loadSample} className="px-3 py-1.5 rounded border text-sm">
          Load sample data
        </button>
        <button
          onClick={() => {
            clearAll();
            setRosterResult(null);
            setActivityResult(null);
          }}
          className="px-3 py-1.5 rounded border text-destructive text-sm"
        >
          Clear all data
        </button>
        <p className="w-full text-xs text-muted-foreground">
          Everything stays in this browser — nothing is sent anywhere.
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
