const ROSTER_COLUMNS: [string, string][] = [
  ["Title Code", "Single line of text — unique, used as the key"],
  ["Full Name", "Single line of text"],
  ["Phone", "Single line of text"],
  ["Email", "Single line of text"],
  ["Reports To", "Lookup → Roster (Title Code)"],
  ["Department", "Choice"],
  ["Region", "Choice, multi-select"],
  ["Level", "Choice — Director, Manager, Rep"],
];

const ACTIVITY_COLUMNS: [string, string][] = [
  ["Status", "Choice — Scheduled, Completed, Refused"],
  ["Title", "Single line of text"],
  ["RetailerId", "Single line of text, indexed"],
  ["Application Date", "Date only"],
  ["Scheduled Date", "Date only, indexed"],
  ["Address", "Multiple lines, plain text"],
  ["Route", "Single line of text, indexed — matches Roster.Title Code"],
  ["Task", "Choice"],
  ["Model", "Choice"],
  ["Brand", "Choice"],
  ["Area", "Single line of text"],
  ["Phone", "Single line of text"],
  ["Notes", "Multiple lines, plain text"],
  ["More Notes", "Multiple lines, plain text"],
];

export default function SharePointPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Rebuilding this in SharePoint</h1>
        <p className="text-muted-foreground mt-1">
          Two lists, a lookup between them, and four views cover everything this app does.
        </p>
      </div>

      <ListSpec
        name="Roster"
        note="One item per person. Title Code is the join key, so keep it unique and stable."
        columns={ROSTER_COLUMNS}
      />
      <ListSpec
        name="Activity"
        note="One item per visit. Route holds the rep's title code; bare three-digit values get an S prefix on import."
        columns={ACTIVITY_COLUMNS}
      />

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Views</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            <b>This week</b> — Activity grouped by Scheduled Date, filtered to the next seven days.
          </li>
          <li>
            <b>My route</b> — Activity filtered to Route equals the current user's title code.
          </li>
          <li>
            <b>Region roll-up</b> — Roster grouped by Region, with a count of open Activity items.
          </li>
          <li>
            <b>Needs a rep</b> — Activity where Route has no matching Roster item. This is the same
            check the Activity page runs.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Permissions</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Reps: read on Roster, edit on Activity items where Route is theirs.</li>
          <li>Managers: read on Roster, edit on Activity across their region.</li>
          <li>Directors and ops: full control, including roster replacement.</li>
          <li>
            Break inheritance on Roster before granting edit rights — a bad Title Code edit orphans
            every activity row pointing at it.
          </li>
        </ul>
      </section>
    </div>
  );
}

function ListSpec({
  name,
  note,
  columns,
}: {
  name: string;
  note: string;
  columns: [string, string][];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">{name} list</h2>
      <p className="text-sm text-muted-foreground">{note}</p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2 font-semibold">Column</th>
              <th className="p-2 font-semibold">Type</th>
            </tr>
          </thead>
          <tbody>
            {columns.map(([col, type]) => (
              <tr key={col} className="border-t">
                <td className="p-2 font-mono text-xs">{col}</td>
                <td className="p-2 text-muted-foreground">{type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
