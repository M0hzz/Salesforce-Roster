import type { ActivityRow, NewActivityRow, Person } from "@/lib/types";
import type { DataStore } from "./store";
import { getSharePointConfig } from "@/lib/sharepoint/config";
import {
  ACTIVITY_DEF,
  ROSTER_DEF,
  fromSpFields,
  spFieldNames,
  toSpFields,
} from "@/lib/sharepoint/mapping";
import { createItem, deleteItem, listAllItems, updateItemFields } from "@/lib/sharepoint/graph";

/** Run tasks with bounded concurrency so bulk imports don't trip throttling. */
async function inBatches<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Stores both datasets in SharePoint lists via Microsoft Graph. Every write
 * goes to the site immediately, so the data is shared across the whole team.
 */
export class SharePointStore implements DataStore {
  readonly kind = "sharepoint" as const;

  private get rosterList() {
    return getSharePointConfig().rosterListName;
  }
  private get activityList() {
    return getSharePointConfig().activityListName;
  }

  async loadAll() {
    const [rosterItems, activityItems] = await Promise.all([
      listAllItems(this.rosterList, spFieldNames(ROSTER_DEF)),
      listAllItems(this.activityList, spFieldNames(ACTIVITY_DEF)),
    ]);
    const roster = rosterItems.map((it) => fromSpFields<Person>(ROSTER_DEF, it.fields));
    const activity = activityItems.map((it) => ({
      ...fromSpFields<Omit<ActivityRow, "id">>(ACTIVITY_DEF, it.fields),
      id: it.id,
    }));
    return { roster, activity };
  }

  /**
   * SharePoint has no swap-contents call, so replacing is a real
   * delete-everything-then-create. The Upload page warns about this.
   */
  async replaceRoster(rows: Person[]) {
    const existing = await listAllItems(this.rosterList, ["Title"]);
    await inBatches(existing, 4, (it) => deleteItem(this.rosterList, it.id));
    await inBatches(rows, 4, (row) => createItem(this.rosterList, toSpFields(ROSTER_DEF, row)));
    return rows;
  }

  async addActivity(rows: NewActivityRow[]) {
    return inBatches(rows, 4, async (row) => {
      const created = await createItem(this.activityList, toSpFields(ACTIVITY_DEF, row));
      return { ...row, id: created.id };
    });
  }

  async replaceActivity(rows: NewActivityRow[]) {
    const existing = await listAllItems(this.activityList, ["Title"]);
    await inBatches(existing, 4, (it) => deleteItem(this.activityList, it.id));
    return this.addActivity(rows);
  }

  async updateActivity(id: string, patch: Partial<ActivityRow>) {
    const fields = toSpFields(ACTIVITY_DEF, patch);
    if (Object.keys(fields).length === 0) return;
    await updateItemFields(this.activityList, id, fields);
  }

  async clearAll() {
    const [rosterItems, activityItems] = await Promise.all([
      listAllItems(this.rosterList, ["Title"]),
      listAllItems(this.activityList, ["Title"]),
    ]);
    await inBatches(rosterItems, 4, (it) => deleteItem(this.rosterList, it.id));
    await inBatches(activityItems, 4, (it) => deleteItem(this.activityList, it.id));
  }
}
