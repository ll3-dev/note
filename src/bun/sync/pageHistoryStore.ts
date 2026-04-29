import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { AutomergeChangeOrigin } from "../../shared/automerge/pageDocument";
import type { PageDocument } from "../../shared/contracts";
import type { DatabaseHandle } from "../database";
import { pageHistoryEntries } from "../schema";

export const LOCAL_ACTOR_ID = "local";
export const PAGE_HISTORY_ENTRY_LIMIT = 1000;

export type PersistedPageHistoryEntry = {
  after: PageDocument;
  before: PageDocument;
  id: string;
};

export function persistPageHistoryEntry(
  handle: DatabaseHandle,
  input: {
    actorId: string;
    after: PageDocument;
    before: PageDocument;
    origin: AutomergeChangeOrigin;
    pageId: string;
  }
) {
  handle.orm
    .insert(pageHistoryEntries)
    .values({
      actor_id: input.actorId,
      after_json: JSON.stringify(input.after),
      before_json: JSON.stringify(input.before),
      created_at: new Date().toISOString(),
      id: crypto.randomUUID(),
      origin: input.origin,
      page_id: input.pageId
    })
    .run();
  trimPageHistoryEntries(handle, input.pageId);
}

export function getUndoEntry(handle: DatabaseHandle, pageId: string) {
  return getEntry(handle, pageId, "undo");
}

function trimPageHistoryEntries(handle: DatabaseHandle, pageId: string) {
  handle.orm.run(sql`
    DELETE FROM page_history_entries
    WHERE page_id = ${pageId}
      AND id NOT IN (
        SELECT id
        FROM page_history_entries
        WHERE page_id = ${pageId}
        ORDER BY created_at DESC, id DESC
        LIMIT ${PAGE_HISTORY_ENTRY_LIMIT}
      )
  `);
}

export function getRedoEntry(handle: DatabaseHandle, pageId: string) {
  return getEntry(handle, pageId, "redo");
}

export function markEntryUndone(handle: DatabaseHandle, entryId: string) {
  handle.orm
    .update(pageHistoryEntries)
    .set({ undone_at: new Date().toISOString() })
    .where(eq(pageHistoryEntries.id, entryId))
    .run();
}

export function markEntryRedone(handle: DatabaseHandle, entryId: string) {
  handle.orm
    .update(pageHistoryEntries)
    .set({ undone_at: null })
    .where(eq(pageHistoryEntries.id, entryId))
    .run();
}

export function discardRedoEntries(handle: DatabaseHandle, pageId: string) {
  handle.orm
    .update(pageHistoryEntries)
    .set({ discarded_at: new Date().toISOString() })
    .where(
      and(
        eq(pageHistoryEntries.page_id, pageId),
        eq(pageHistoryEntries.origin, "local"),
        eq(pageHistoryEntries.actor_id, LOCAL_ACTOR_ID),
        isNotNull(pageHistoryEntries.undone_at),
        isNull(pageHistoryEntries.discarded_at)
      )
    )
    .run();
}

function getEntry(
  handle: DatabaseHandle,
  pageId: string,
  direction: "redo" | "undo"
): PersistedPageHistoryEntry | null {
  const row = handle.orm
    .select()
    .from(pageHistoryEntries)
    .where(
      and(
        eq(pageHistoryEntries.page_id, pageId),
        eq(pageHistoryEntries.origin, "local"),
        eq(pageHistoryEntries.actor_id, LOCAL_ACTOR_ID),
        isNull(pageHistoryEntries.discarded_at),
        direction === "undo"
          ? isNull(pageHistoryEntries.undone_at)
          : isNotNull(pageHistoryEntries.undone_at)
      )
    )
    .orderBy(desc(pageHistoryEntries.created_at))
    .get();

  return row
    ? {
        after: JSON.parse(row.after_json) as PageDocument,
        before: JSON.parse(row.before_json) as PageDocument,
        id: row.id
      }
    : null;
}
