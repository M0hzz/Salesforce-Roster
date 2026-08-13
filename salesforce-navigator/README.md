# SalesForce Navigator

A field-sales roster and activity tracker. Paste your team roster and visit list in
from Excel, then search people, walk the reporting line, and update visit status.
Everything lives in the browser's local storage — no server, no accounts.

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
| `/sharepoint` | Blueprint for rebuilding the same thing as SharePoint lists |
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

- `Clear all data` wipes local storage for both lists and can't be undone.
- Uploading a roster replaces it wholesale, which orphans activity rows pointing at
  title codes that no longer exist. The Activity page flags those.
