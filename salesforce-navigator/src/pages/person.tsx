import { useParams, Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useData, personForActivity, descendantsOf, type Person } from "@/lib/data-context";

export default function PersonDetailPage() {
  const { id } = useParams();
  const { roster, activity } = useData();
  const person = roster.find((p) => p["Title Code"] === id);

  if (!person) {
    return (
      <div className="p-8 rounded-xl border bg-card text-center space-y-2">
        <p className="font-semibold">No one in the roster has the code “{id}”.</p>
        <p className="text-sm text-muted-foreground">
          The roster may have been replaced since this link was made.
        </p>
        <Link to="/" className="text-primary underline">
          Back to search
        </Link>
      </div>
    );
  }

  const directs = roster.filter((p) => p["Reports To"] === person["Title Code"]);

  const chain: Person[] = [];
  const seen = new Set<string>([person["Title Code"]]);
  let cur = person["Reports To"];
  while (cur && !seen.has(cur)) {
    const m = roster.find((p) => p["Title Code"] === cur);
    if (!m) break;
    seen.add(m["Title Code"]);
    chain.unshift(m);
    cur = m["Reports To"];
  }

  const own = activity.filter(
    (a) => personForActivity(a, roster)?.["Title Code"] === person["Title Code"]
  );
  const teamCodes = new Set(descendantsOf(person["Title Code"], roster).map((p) => p["Title Code"]));
  const teamActivity = activity.filter((a) => {
    const owner = personForActivity(a, roster);
    return owner && teamCodes.has(owner["Title Code"]);
  });

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl border bg-card space-y-2">
        <div className="text-sm text-muted-foreground">
          {chain.map((m) => (
            <span key={m["Title Code"]}>
              <Link to={"/person/" + m["Title Code"]} className="hover:underline">
                {m["Full Name"]}
              </Link>
              {" / "}
            </span>
          ))}
          <span className="font-semibold text-foreground">{person["Full Name"]}</span>
        </div>
        <h1 className="text-2xl font-bold">{person["Full Name"]}</h1>
        <div className="text-muted-foreground">
          {[person["Title Code"], person.Level, person.Department, person.Region]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <div className="flex flex-wrap gap-4 pt-1 text-sm">
          {person.Email && (
            <a href={`mailto:${person.Email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <Mail className="h-4 w-4" /> {person.Email}
            </a>
          )}
          {person.Phone && (
            <a href={`tel:${person.Phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
              <Phone className="h-4 w-4" /> {person.Phone}
            </a>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-bold mb-2">Direct reports ({directs.length})</h2>
        {directs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody reports to {person["Full Name"]}.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {directs.map((d) => (
              <Link
                key={d["Title Code"]}
                to={"/person/" + d["Title Code"]}
                className="p-3 rounded-lg border bg-card hover:bg-muted transition-colors"
              >
                <div className="font-semibold">{d["Full Name"]}</div>
                <div className="text-xs text-muted-foreground">
                  {[d["Title Code"], d.Region].filter(Boolean).join(" · ")}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ActivityTable title={`Own activity (${own.length})`} rows={own} />

      {teamCodes.size > 0 && (
        <ActivityTable
          title={`Team activity (${teamActivity.length})`}
          rows={teamActivity}
          showOwner
          roster={roster}
        />
      )}
    </div>
  );
}

function ActivityTable({
  title,
  rows,
  showOwner,
  roster,
}: {
  title: string;
  rows: ReturnType<typeof useData>["activity"];
  showOwner?: boolean;
  roster?: Person[];
}) {
  return (
    <section>
      <h2 className="font-bold mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing on the books.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2 font-semibold">Date</th>
                <th className="p-2 font-semibold">Status</th>
                {showOwner && <th className="p-2 font-semibold">Rep</th>}
                <th className="p-2 font-semibold">Retailer</th>
                <th className="p-2 font-semibold">Task</th>
                <th className="p-2 font-semibold">Area</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .sort((a, b) => (a["Scheduled Date"] || "").localeCompare(b["Scheduled Date"] || ""))
                .map((a) => {
                  const owner = roster ? personForActivity(a, roster) : undefined;
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{a["Scheduled Date"] || "—"}</td>
                      <td className="p-2">{a.Status || "—"}</td>
                      {showOwner && (
                        <td className="p-2 whitespace-nowrap">
                          {owner ? (
                            <Link
                              to={"/person/" + owner["Title Code"]}
                              className="text-primary hover:underline"
                            >
                              {owner["Full Name"]}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      <td className="p-2">{a.RetailerId || a.Title || "—"}</td>
                      <td className="p-2">{a.Task || "—"}</td>
                      <td className="p-2">{a.Area || "—"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
