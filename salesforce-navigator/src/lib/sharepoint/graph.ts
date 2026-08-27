import { GRAPH_BASE, getSharePointConfig } from "./config";
import { getToken } from "./auth";

type Json = Record<string, unknown>;

async function graphFetch(path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const token = await getToken();
  const url = path.startsWith("https://") ? path : GRAPH_BASE + path;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if ((res.status === 429 || res.status === 503) && attempt < 3) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "2");
    await new Promise((r) => setTimeout(r, Math.min(retryAfter, 30) * 1000));
    return graphFetch(path, init, attempt + 1);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Graph ${init.method ?? "GET"} ${path} failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  return res;
}

let siteIdPromise: Promise<string> | null = null;

export function getSiteId(): Promise<string> {
  if (!siteIdPromise) {
    const cfg = getSharePointConfig();
    siteIdPromise = graphFetch(`/sites/${cfg.hostname}:${cfg.sitePath}`)
      .then((r) => r.json() as Promise<{ id: string }>)
      .then((s) => s.id)
      .catch((e) => {
        siteIdPromise = null; // allow retry after a transient failure
        throw e;
      });
  }
  return siteIdPromise;
}

const listIdCache = new Map<string, string>();

export async function getListId(displayName: string): Promise<string> {
  const cached = listIdCache.get(displayName);
  if (cached) return cached;
  const siteId = await getSiteId();
  const res = await graphFetch(
    `/sites/${siteId}/lists?$filter=displayName eq '${displayName.replace(/'/g, "''")}'&$select=id,displayName`
  );
  const body = (await res.json()) as { value: { id: string; displayName: string }[] };
  const list = body.value[0];
  if (!list) {
    throw new Error(
      `List "${displayName}" not found on the site. Run "npm run provision" to create it.`
    );
  }
  listIdCache.set(displayName, list.id);
  return list.id;
}

export type SpItem = { id: string; fields: Json };

/** Fetch every item in a list, following server paging. */
export async function listAllItems(listName: string, selectFields: string[]): Promise<SpItem[]> {
  const siteId = await getSiteId();
  const listId = await getListId(listName);
  const select = selectFields.join(",");
  let url: string | null =
    `${GRAPH_BASE}/sites/${siteId}/lists/${listId}/items?$expand=fields($select=${select})&$top=999`;
  const items: SpItem[] = [];
  while (url) {
    const res = await graphFetch(url);
    const body = (await res.json()) as { value: SpItem[]; "@odata.nextLink"?: string };
    items.push(...body.value);
    url = body["@odata.nextLink"] ?? null;
  }
  return items;
}

export async function createItem(listName: string, fields: Json): Promise<SpItem> {
  const siteId = await getSiteId();
  const listId = await getListId(listName);
  const res = await graphFetch(`/sites/${siteId}/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  return (await res.json()) as SpItem;
}

export async function updateItemFields(listName: string, itemId: string, fields: Json): Promise<void> {
  const siteId = await getSiteId();
  const listId = await getListId(listName);
  await graphFetch(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export async function deleteItem(listName: string, itemId: string): Promise<void> {
  const siteId = await getSiteId();
  const listId = await getListId(listName);
  await graphFetch(`/sites/${siteId}/lists/${listId}/items/${itemId}`, { method: "DELETE" });
}
