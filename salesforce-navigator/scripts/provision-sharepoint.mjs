#!/usr/bin/env node
// Creates the Roster and Activity lists this app expects, driven by
// src/lib/sharepoint/lists.schema.json. Safe to re-run: existing lists and
// columns are left alone.
//
// Reads config from .env.local / .env (VITE_SP_* vars) or the environment,
// signs in with the device-code flow, and talks to Microsoft Graph directly.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(
  readFileSync(join(root, "src/lib/sharepoint/lists.schema.json"), "utf8")
);

// ---- config ---------------------------------------------------------------

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
  }
}
loadDotEnv();

const cfg = {
  clientId: process.env.VITE_SP_CLIENT_ID,
  tenantId: process.env.VITE_SP_TENANT_ID || "organizations",
  hostname: process.env.VITE_SP_HOSTNAME,
  sitePath: process.env.VITE_SP_SITE_PATH,
  rosterList: process.env.VITE_SP_ROSTER_LIST || schema.roster.listName,
  activityList: process.env.VITE_SP_ACTIVITY_LIST || schema.activity.listName,
};

const missing = ["clientId", "hostname", "sitePath"].filter((k) => !cfg[k]);
if (missing.length) {
  console.error(
    "Missing config. Set these in .env.local (see .env.example): " +
      missing
        .map((k) => ({ clientId: "VITE_SP_CLIENT_ID", hostname: "VITE_SP_HOSTNAME", sitePath: "VITE_SP_SITE_PATH" })[k])
        .join(", ")
  );
  process.exit(1);
}
if (!cfg.sitePath.startsWith("/")) cfg.sitePath = "/" + cfg.sitePath;

// ---- device-code sign-in --------------------------------------------------

const SCOPE = "https://graph.microsoft.com/Sites.ReadWrite.All offline_access";

async function deviceCodeToken() {
  const base = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0`;
  const codeRes = await fetch(`${base}/devicecode`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, scope: SCOPE }),
  });
  const code = await codeRes.json();
  if (!codeRes.ok) {
    throw new Error(`Device code request failed: ${code.error_description || code.error}`);
  }
  console.log("\n" + code.message + "\n");

  const interval = (code.interval || 5) * 1000;
  for (;;) {
    await new Promise((r) => setTimeout(r, interval));
    const tokenRes = await fetch(`${base}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: cfg.clientId,
        device_code: code.device_code,
      }),
    });
    const token = await tokenRes.json();
    if (tokenRes.ok) return token.access_token;
    if (token.error === "authorization_pending" || token.error === "slow_down") continue;
    throw new Error(`Sign-in failed: ${token.error_description || token.error}`);
  }
}

// ---- Graph helpers --------------------------------------------------------

const GRAPH = "https://graph.microsoft.com/v1.0";
let accessToken;

async function graph(method, path, body) {
  const res = await fetch(GRAPH + path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const wait = Number(res.headers.get("Retry-After") || 5);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return graph(method, path, body);
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${json.error?.message || text}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

function columnDefinition(field) {
  const def = { name: field.sp, displayName: field.app, indexed: !!field.indexed };
  if (field.required) def.required = true;
  if (field.unique) def.enforceUniqueValues = true;
  if (field.type === "text") def.text = {};
  else if (field.type === "note") def.text = { allowMultipleLines: true, textType: "plain" };
  else if (field.type === "date") def.dateTime = { displayAs: "standard", format: "dateOnly" };
  return def;
}

// ---- provisioning ---------------------------------------------------------

async function ensureList(listName, listDef) {
  const found = await graph(
    "GET",
    `/sites/${siteId}/lists?$filter=displayName eq '${listName.replace(/'/g, "''")}'&$select=id,displayName`
  );
  let list = found.value[0];
  if (list) {
    console.log(`List "${listName}" already exists.`);
  } else {
    list = await graph("POST", `/sites/${siteId}/lists`, {
      displayName: listName,
      description: listDef.description,
      list: { template: "genericList" },
    });
    console.log(`Created list "${listName}".`);
  }

  const existing = await graph("GET", `/sites/${siteId}/lists/${list.id}/columns?$select=name,displayName`);
  const existingNames = new Set(existing.value.map((c) => c.name));

  for (const field of listDef.fields) {
    if (field.sp === "Title") {
      // Title always exists; align its display name with the app's field name.
      const title = existing.value.find((c) => c.name === "Title");
      if (title && title.displayName !== field.app) {
        try {
          await graph("PATCH", `/sites/${siteId}/lists/${list.id}/columns/Title`, {
            displayName: field.app,
          });
          console.log(`  Renamed Title column to "${field.app}".`);
        } catch (e) {
          console.warn(`  Could not rename Title column (${e.message}) — rename it in list settings.`);
        }
      }
      if (field.unique) {
        console.log(
          `  Note: set "${field.app}" (Title) to enforce unique values in list settings — Graph cannot change that on the built-in column.`
        );
      }
      continue;
    }
    if (existingNames.has(field.sp)) {
      console.log(`  Column "${field.sp}" already exists.`);
      continue;
    }
    await graph("POST", `/sites/${siteId}/lists/${list.id}/columns`, columnDefinition(field));
    console.log(`  Created column "${field.app}" (${field.sp}).`);
  }
}

console.log(`Provisioning SharePoint lists on ${cfg.hostname}${cfg.sitePath}…`);
accessToken = await deviceCodeToken();

const site = await graph("GET", `/sites/${cfg.hostname}:${cfg.sitePath}`);
const siteId = site.id;
console.log(`Site: ${site.displayName || site.name} (${siteId})`);

await ensureList(cfg.rosterList, schema.roster);
await ensureList(cfg.activityList, schema.activity);

console.log("\nDone. Open the app's Storage page, pick SharePoint, and sign in.");
