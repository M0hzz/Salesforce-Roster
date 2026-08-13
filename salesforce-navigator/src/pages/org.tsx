import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useData, normalizeRoute } from "@/lib/data-context";

const REGIONS = [
  "Manhattan",
  "Bronx",
  "Brooklyn",
  "Queens",
  "Staten Island",
  "Nassau",
  "Suffolk",
] as const;

export default function OrgChartPage() {
  const { roster, activity } = useData();
  const [region, setRegion] = useState<string | null>(null);
  const nav = useNavigate();

  const inRegion = (r: string) => roster.filter((p) => (p.Region || "").includes(r));

  // A region's manager is the person marked Manager, or whoever sits highest
  // in the reporting line among the people assigned there.
  const managerFor = (r: string) => {
    const people = inRegion(r);
    return (
      people.find((p) => p.Level === "Manager") ??
      people.find((p) => !p["Reports To"] || !roster.some((m) => m["Title Code"] === p["Reports To"]))
    );
  };

  const openFor = (code: string) =>
    activity.filter(
      (a) => normalizeRoute(a.Route).toUpperCase() === code.toUpperCase() && a.Status !== "Completed"
    ).length;

  if (roster.length === 0) {
    return (
      <div className="p-8 rounded-xl border bg-card text-center space-y-2">
        <p className="font-semibold">No roster loaded yet</p>
        <p className="text-sm text-muted-foreground">
          The org chart is built from the roster's Region and Reports To columns.
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

  if (!region) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Coverage by region</h1>
        <div className="grid md:grid-cols-3 gap-4">
          {REGIONS.map((r) => {
            const m = managerFor(r);
            const count = inRegion(r).length;
            return (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className="p-6 rounded-xl border bg-gradient-to-br from-fuchsia-100 to-orange-100 text-left hover:from-fuchsia-200 hover:to-orange-200 transition-colors"
              >
                <div className="font-bold text-lg">{r}</div>
                <div className="text-sm">{m ? m["Full Name"] : "Unassigned"}</div>
                <div className="text-xs text-muted-foreground">
                  {count} {count === 1 ? "person" : "people"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const manager = managerFor(region);
  const team = inRegion(region).filter((p) => p["Title Code"] !== manager?.["Title Code"]);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setRegion(null)}
        className="text-primary inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Back to regions
      </button>
      <h1 className="text-2xl font-bold">{region}</h1>

      {manager && (
        <button
          onClick={() => nav("/person/" + manager["Title Code"])}
          className="w-full text-left p-4 rounded-xl border bg-secondary"
        >
          <div className="text-xs uppercase tracking-wide text-secondary-foreground">Manager</div>
          <div className="font-semibold">{manager["Full Name"]}</div>
          <div className="text-sm text-muted-foreground">{manager["Title Code"]}</div>
        </button>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        {team.map((p) => {
          const open = openFor(p["Title Code"]);
          return (
            <button
              key={p["Title Code"]}
              onClick={() => nav("/person/" + p["Title Code"])}
              className="p-3 rounded-lg border bg-card text-left hover:bg-muted transition-colors"
            >
              <div className="font-semibold">{p["Full Name"]}</div>
              <div className="text-xs text-muted-foreground">
                {[p["Title Code"], p.Level].filter(Boolean).join(" · ")}
              </div>
              <div className="text-xs mt-1 text-muted-foreground">
                {open > 0 ? `${open} open` : "Nothing open"}
              </div>
            </button>
          );
        })}
        {team.length === 0 && (
          <p className="text-sm text-muted-foreground md:col-span-3">
            Nobody else is assigned to {region} yet.
          </p>
        )}
      </div>
    </div>
  );
}
