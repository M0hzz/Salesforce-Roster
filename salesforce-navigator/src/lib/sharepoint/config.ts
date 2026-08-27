export type SharePointConfig = {
  clientId: string;
  tenantId: string;
  /** e.g. "contoso.sharepoint.com" */
  hostname: string;
  /** Server-relative site path, e.g. "/sites/SalesOps" */
  sitePath: string;
  rosterListName: string;
  activityListName: string;
};

import schema from "./lists.schema.json";

function env(key: string): string {
  return ((import.meta.env as Record<string, unknown>)[key] as string | undefined)?.trim() ?? "";
}

export function getSharePointConfig(): SharePointConfig {
  const sitePath = env("VITE_SP_SITE_PATH");
  return {
    clientId: env("VITE_SP_CLIENT_ID"),
    tenantId: env("VITE_SP_TENANT_ID") || "organizations",
    hostname: env("VITE_SP_HOSTNAME"),
    sitePath: sitePath.startsWith("/") || sitePath === "" ? sitePath : `/${sitePath}`,
    rosterListName: env("VITE_SP_ROSTER_LIST") || schema.roster.listName,
    activityListName: env("VITE_SP_ACTIVITY_LIST") || schema.activity.listName,
  };
}

/** All the env vars needed to even attempt a connection. */
export function missingSharePointConfig(): string[] {
  const cfg = getSharePointConfig();
  const missing: string[] = [];
  if (!cfg.clientId) missing.push("VITE_SP_CLIENT_ID");
  if (!cfg.hostname) missing.push("VITE_SP_HOSTNAME");
  if (!cfg.sitePath) missing.push("VITE_SP_SITE_PATH");
  return missing;
}

export function isSharePointConfigured(): boolean {
  return missingSharePointConfig().length === 0;
}

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
export const GRAPH_SCOPES = ["https://graph.microsoft.com/Sites.ReadWrite.All"];
