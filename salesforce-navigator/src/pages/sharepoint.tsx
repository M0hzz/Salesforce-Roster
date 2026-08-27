import { Link } from "react-router-dom";
import { ACTIVITY_DEF, ROSTER_DEF, type FieldDef, type ListDef } from "@/lib/sharepoint/mapping";

const TYPE_LABEL: Record<FieldDef["type"], string> = {
  text: "Single line of text",
  note: "Multiple lines, plain text",
  date: "Date only",
};

function typeOf(field: FieldDef): string {
  const flags = [
    field.required && "required",
    field.indexed && "indexed",
    field.unique && "unique",
  ].filter(Boolean);
  return TYPE_LABEL[field.type] + (flags.length ? ` — ${flags.join(", ")}` : "");
}

export default function SharePointPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">SharePoint setup</h1>
        <p className="text-muted-foreground mt-1">
          This app can store its data directly in two SharePoint lists — switch backends on the{" "}
          <Link to="/storage" className="underline">
            Storage
          </Link>{" "}
          page. The tables below come from{" "}
          <code className="text-xs">src/lib/sharepoint/lists.schema.json</code>, the same file the
          app and the provisioning script use.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Connecting the app</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            In Entra ID, register a single-page application. Add your app's URL (e.g.{" "}
            <code className="text-xs">http://localhost:5173</code>) as an SPA redirect URI and grant
            it the delegated Microsoft Graph permission{" "}
            <code className="text-xs">Sites.ReadWrite.All</code>.
          </li>
          <li>
            Copy <code className="text-xs">.env.example</code> to{" "}
            <code className="text-xs">.env.local</code> and fill in the client id, tenant id, and the
            SharePoint site's hostname and path.
          </li>
          <li>
            Run <code className="text-xs">npm run provision</code> once — it signs you in with a
            device code and creates both lists with the columns below.
          </li>
          <li>
            Start the app, open <Link to="/storage" className="underline">Storage</Link>, pick
            SharePoint, and sign in.
          </li>
        </ol>
      </section>

      <ListSpec
        def={ROSTER_DEF}
        note="One item per person. Title Code is the join key, so keep it unique and stable."
      />
      <ListSpec
        def={ACTIVITY_DEF}
        note="One item per visit. Route holds the rep's title code; bare three-digit values get an S prefix on import."
      />

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Views worth adding in SharePoint</h2>
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

function ListSpec({ def, note }: { def: ListDef; note: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">{def.listName} list</h2>
      <p className="text-sm text-muted-foreground">{note}</p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2 font-semibold">Column</th>
              <th className="p-2 font-semibold">Internal name</th>
              <th className="p-2 font-semibold">Type</th>
            </tr>
          </thead>
          <tbody>
            {def.fields.map((field) => (
              <tr key={field.app} className="border-t align-top">
                <td className="p-2 font-mono text-xs">{field.app}</td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{field.sp}</td>
                <td className="p-2 text-muted-foreground">
                  {typeOf(field)}
                  {field.note && <span className="block text-xs mt-0.5">{field.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
