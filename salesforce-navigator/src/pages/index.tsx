import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Users, ClipboardList } from "lucide-react";
import { useData, normalizeRoute } from "@/lib/data-context";

export default function HomePage() {
  const { roster, activity } = useData();
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [] as typeof roster;
    return roster
      .filter((p) =>
        [p["Full Name"], p["Title Code"], p.Email, p.Department, p.Region, p.Level].some((v) =>
          (v || "").toLowerCase().includes(s)
        )
      )
      .slice(0, 50);
  }, [q, roster]);

  const openCount = (code: string) =>
    activity.filter(
      (a) => normalizeRoute(a.Route).toUpperCase() === code.toUpperCase() && a.Status !== "Completed"
    ).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Find your team</h1>

      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, code, email, region…"
          aria-label="Search the roster"
          className="w-full pl-10 pr-4 py-3 rounded-xl border bg-card"
        />
      </div>

      {roster.length === 0 ? (
        <div className="p-8 rounded-xl border bg-card text-center space-y-2">
          <Users className="h-8 w-8 mx-auto text-primary" />
          <p className="font-semibold">No roster loaded yet</p>
          <p className="text-sm text-muted-foreground">
            Paste your team roster on the Upload page, or load the sample data to look around.
          </p>
          <Link
            to="/upload"
            className="inline-block mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Go to Upload
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {results.map((p) => (
            <button
              key={p["Title Code"]}
              onClick={() => nav("/person/" + p["Title Code"])}
              className="text-left p-4 rounded-lg border bg-card hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{p["Full Name"]}</div>
                  <div className="text-sm text-muted-foreground">
                    {[p["Title Code"], p.Department, p.Region].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {openCount(p["Title Code"]) > 0 && (
                  <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" />
                    {openCount(p["Title Code"])} open
                  </span>
                )}
              </div>
            </button>
          ))}
          {q.trim() && results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing matches “{q.trim()}”. Try a title code like S101, or a region.
            </p>
          )}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {roster.length} people · {activity.length} activity rows
      </div>
    </div>
  );
}
