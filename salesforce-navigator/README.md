# SalesForce Navigator

A field-sales roster and activity tracker. Paste your team roster and visit list in
from Excel, then search people, walk the reporting line, and update visit status.
Data lives either in the browser's local storage (the default — no server, no
accounts) or in two SharePoint lists via Microsoft Graph, shared with the whole
team. Switch backends on the **Storage** page.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

Vite 5, React 18, TypeScript, Tailwind v4, React Router 6 (hash routing, so `dist/`
works from any static host or file path).

## Pages

| Route | What it does |
| --- | --- |
| `/` | Search the roster by name, title code, email, department, or region |
| `/upload` | Paste or pick a CSV/TSV for the roster (replaces) and activity (appends) |
| `/org` | Region cards → the team assigned to that region |
| `/activity` | KPIs, status/text filters, inline status and notes editing |
| `/person/:code` | Reporting chain, contact links, direct reports, own + team activity |
| `/storage` | Pick the storage backend, sign in to Microsoft, see connection state |
| `/sharepoint` | Setup walkthrough plus the list/column reference, generated from the schema |
| `/source` | Reads the app's own source, straight out of the bundle |

## Data model

**Roster** — `Title Code` (unique key), `Full Name`, `Phone`, `Email`, `Reports To`
(another Title Code), `Department`, `Region`, `Level`.

**Activity** — `Status`, `Title`, `RetailerId`, `Application Date`, `Scheduled Date`,
`Address`, `Route`, `Task`, `Model`, `Brand`, `Area`, `Phone`, `Notes`, `More Notes`.

The two are joined on `Route` → `Title Code`. A bare three-digit route gets an `S`
prefix on the way in, so `101` and `S101` both land on rep S101. Rows whose route
matches nobody are counted and listed at the top of the Activity page rather than
silently dropped.

## SharePoint storage

The SharePoint backend stores the roster and activity in two lists on a site you
choose, talking to Microsoft Graph from the browser with a delegated sign-in
(MSAL popup — no app secret anywhere).

One-time setup:

1. **Register an app** in Entra ID as a single-page application. Add your app's
   URL (e.g. `http://localhost:5173`) as an SPA redirect URI, enable *Allow
   public client flows* (for the provisioning script's device-code sign-in), and
   grant the delegated Microsoft Graph permission `Sites.ReadWrite.All`.
2. **Configure** — copy `.env.example` to `.env.local` and fill in
   `VITE_SP_CLIENT_ID`, `VITE_SP_TENANT_ID`, `VITE_SP_HOSTNAME`, and
   `VITE_SP_SITE_PATH`.
3. **Provision** — `npm run provision` signs you in with a device code and
   creates the `Roster` and `Activity` lists with the right columns. Safe to
   re-run; existing lists and columns are left alone.
4. **Switch** — in the app, open **Storage**, pick SharePoint, and sign in.

`src/lib/sharepoint/lists.schema.json` is the single source of truth for the
lists: the runtime field mapping, the provisioning script, and the `/sharepoint`
reference page all read it, so a column rename is a one-line change.

Worth knowing:

- Person/activity title codes ride in SharePoint's built-in `Title` column
  (renamed), and `Reports To` is plain text holding a title code rather than a
  lookup column — the app resolves the reporting chain itself, and plain text
  keeps CSV imports simple.
- Inline note/status edits are written after a 700 ms pause (and flushed when
  the tab closes), so typing doesn't become a network write per keystroke.
- Replacing the roster or clearing all data against SharePoint is a genuine
  delete-then-create across the shared lists — it affects everyone on the site,
  and the Upload page warns before doing it.
- Activity row ids are the SharePoint item ids while connected, so edits made
  elsewhere show up after a refresh on the Storage page.

## What was broken in the original files

- **`src/lib/csv.ts`** — the escape sequences had collapsed into literal characters:
  `/\r?\n/` had become a regex with a real newline in it, `"\t"` was a literal tab,
  and the `\r` skip branch compared against an empty string. Restored all four.
- **`src/lib/data-context.tsx`** — `normalizeRoute` tested `/^d{3}$/`, which matches
  the literal text `ddd`, not three digits. Now `/^\d{3}$/`.
- **Missing files** — `tsconfig.app.json`, `tsconfig.node.json`, and
  `src/lib/source-files.ts` were referenced but absent.
- **Tailwind v4 theme** — the tokens in `index.css` were plain `:root` variables, so
  `bg-card`, `border-border`, and friends resolved to nothing. They're registered in
  an `@theme inline` block now.
- **`package.json`** — `clsx` and `tailwind-merge` were imported but not declared;
  `@tailwindcss/vite` was missing, so no Tailwind ran at build time. `d3` was declared
  but never imported, and is gone.
- **Stubs filled in** — `loadSample()` was an empty function, the source viewer was a
  `return null` placeholder, and the person page's activity table was a comment.

## Notes

- `Clear all data` wipes both datasets in whichever backend is active and can't
  be undone — against SharePoint that deletes the shared lists' items for
  everyone, so the Upload page asks first.
- Uploading a roster replaces it wholesale, which orphans activity rows pointing at
  title codes that no longer exist. The Activity page flags those.
