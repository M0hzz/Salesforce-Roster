import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData, normalizeRoute, personForActivity } from "@/lib/data-context";

const STATUSES = ["Scheduled", "Completed", "Refused"];

export default function ActivityPage() {
  const { activity, roster, updateActivity } = useData();
  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");

  const stats = useMemo(
    () => ({
      total: activity.length,
      retailers: new Set(activity.map((a) => a.RetailerId).filter(Boolean)).size,
      scheduled: activity.filter((a) => a.Status === "Scheduled").length,
      completed: activity.filter((a) => a.Status === "Completed").length,
    }),
    [activity]
  );

  const unmatched = useMemo(
    () => activity.filter((a) => !personForActivity(a, roster)),
    [activity, roster]
  );

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return activity
      .filter((a) => status === "All" || a.Status === status)
      .filter(
        (a) =>
          !s ||
          [a.Title, a.RetailerId, a.Route, a.Task, a.Area, a.Address, a.Notes].some((v) =>
            (v || "").toLowerCase().includes(s)
          )
      )
      .slice()
      .sort((a, b) => (a["Scheduled Date"] || "").localeCompare(b["Scheduled Date"] || ""));
  }, [activity, status, q]);

  if (activity.length === 0) {
    return (
      <div className="p-8 rounded-xl border bg-card text-center space-y-2">
        <p className="font-semibold">No activity loaded yet</p>
        <p className="text-sm text-muted-foreground">
          Add rows on the Upload page to see scheduling, status, and route coverage here.
        </p>
        <Link
          to="/upload"
          className="inline-block mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Total" value={stats.total} />
        <KPI label="Retailers" value={stats.retailers} />
        <KPI label="Scheduled" value={stats.scheduled} />
        <KPI label="Completed" value={stats.completed} />
      </div>

      {unmatched.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm">
          <span className="font-semibold">
            {unmatched.length} {unmatched.length === 1 ? "row has" : "rows have"} a route with no
            matching person.
          </span>{" "}
          Add these title codes to the roster, or fix the Route values:{" "}
          {[...new Set(unmatched.map((a) => normalizeRoute(a.Route) || "(blank)"))]
            .slice(0, 8)
            .join(", ")}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by retailer, route, task, area…"
          aria-label="Filter activity"
          className="flex-1 min-w-60 px-3 py-2 rounded-lg border bg-card text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2 rounded-lg border bg-card text-sm"
        >
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Route</Th>
              <Th>Assigned to</Th>
              <Th>Task</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const person = personForActivity(a, roster);
              return (
                <tr key={a.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{a["Scheduled Date"] || "—"}</td>
                  <td className="p-2">
                    <select
                      value={a.Status ?? "Scheduled"}
                      aria-label={`Status for ${a.Title || a.RetailerId || "row"}`}
                      onChange={(e) => updateActivity(a.id, { Status: e.target.value })}
                      className="border rounded px-1.5 py-1 bg-background"
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 whitespace-nowrap">{normalizeRoute(a.Route) || "—"}</td>
                  <td className="p-2 whitespace-nowrap">
                    {person ? (
                      <Link
                        to={"/person/" + person["Title Code"]}
                        className="text-primary hover:underline"
                      >
                        {person["Full Name"]}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="p-2">{a.Task || "—"}</td>
                  <td className="p-2 min-w-52">
                    <input
                      value={a.Notes || ""}
                      aria-label={`Notes for ${a.Title || a.RetailerId || "row"}`}
                      onChange={(e) => updateActivity(a.id, { Notes: e.target.value })}
                      className="w-full border rounded px-2 py-1 bg-background"
                      placeholder="Add a note"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            No rows match this filter. Clear the search or switch the status back to All.
          </p>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-2 font-semibold">{children}</th>;
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl border bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
