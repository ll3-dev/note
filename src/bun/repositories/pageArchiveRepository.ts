import { asc, eq, isNotNull, sql } from "drizzle-orm";
import type { DatabaseHandle } from "@/bun/database";
import { pageHistoryEntries, pages } from "@/bun/schema";
import { mapPage } from "./noteRows";
import {
  deletePageFromSearchIndex,
  indexPage
} from "./searchIndexRepository";
import type { DeletePageInput, RestorePageInput } from "@/shared/contracts";

export function deletePage(
  handle: DatabaseHandle,
  input: DeletePageInput
): { deleted: true } {
  archivePagesWithDescendants(handle, [input.pageId]);

  return { deleted: true };
}

export function listArchivedPages(handle: DatabaseHandle) {
  const rows = handle.orm
    .select()
    .from(pages)
    .where(isNotNull(pages.archived_at))
    .orderBy(asc(pages.archived_at), asc(pages.parent_page_id), asc(pages.sort_key))
    .all();

  return rows.map(mapPage);
}

export function restorePage(
  handle: DatabaseHandle,
  input: RestorePageInput
): { restored: true } {
  const pageIdsToRestore = collectPageIdsWithDescendants(handle, [input.pageId]);

  for (const pageId of pageIdsToRestore) {
    handle.orm
      .update(pages)
      .set({
        archived_at: null,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(pages.id, pageId))
      .run();

    const restored = handle.orm
      .select()
      .from(pages)
      .where(eq(pages.id, pageId))
      .get();

    if (restored) {
      indexPage(handle, mapPage(restored));
    }
  }

  return { restored: true };
}

export function purgeExpiredArchivedPages(
  handle: DatabaseHandle
): { purgedCount: number } {
  const cutoff = handle.db
    .query<{ cutoff: string }, []>(
      `SELECT datetime('now', '-30 days') AS cutoff`
    )
    .get()?.cutoff;

  if (!cutoff) {
    return { purgedCount: 0 };
  }

  const candidates = handle.orm
    .select({ archivedAt: pages.archived_at, id: pages.id })
    .from(pages)
    .where(isNotNull(pages.archived_at))
    .all()
    .filter((page) => page.archivedAt && page.archivedAt < cutoff);
  const purgeIds = new Set<string>();

  for (const candidate of candidates) {
    const descendantIds = collectPageIdsWithDescendants(handle, [candidate.id]);

    if (hasUnexpiredArchivedDescendant(handle, descendantIds, cutoff)) {
      continue;
    }

    for (const pageId of descendantIds) {
      purgeIds.add(pageId);
    }
  }

  for (const pageId of purgeIds) {
    handle.db.query("DELETE FROM blocks_fts WHERE page_id = ?").run(pageId);
    deletePageFromSearchIndex(handle, pageId);
    handle.orm
      .delete(pageHistoryEntries)
      .where(eq(pageHistoryEntries.page_id, pageId))
      .run();
  }

  for (const pageId of purgeIds) {
    handle.orm.delete(pages).where(eq(pages.id, pageId)).run();
  }

  return { purgedCount: purgeIds.size };
}

export function archivePagesWithDescendants(
  handle: DatabaseHandle,
  pageIds: string[]
) {
  const pageIdsToArchive = collectPageIdsWithDescendants(handle, pageIds);

  for (const pageId of pageIdsToArchive) {
    handle.orm
      .update(pages)
      .set({
        archived_at: sql`CURRENT_TIMESTAMP`,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(pages.id, pageId))
      .run();
    deletePageFromSearchIndex(handle, pageId);
  }
}

function collectPageIdsWithDescendants(
  handle: DatabaseHandle,
  pageIds: string[]
) {
  const seen = new Set<string>();
  const pending = [...new Set(pageIds.filter(Boolean))];

  while (pending.length > 0) {
    const pageId = pending.pop();

    if (!pageId || seen.has(pageId)) {
      continue;
    }

    seen.add(pageId);

    const children = handle.orm
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.parent_page_id, pageId))
      .all();

    for (const child of children) {
      pending.push(child.id);
    }
  }

  return [...seen];
}

function hasUnexpiredArchivedDescendant(
  handle: DatabaseHandle,
  pageIds: string[],
  cutoff: string
) {
  for (const pageId of pageIds) {
    const page = handle.orm
      .select({ archivedAt: pages.archived_at })
      .from(pages)
      .where(eq(pages.id, pageId))
      .get();

    if (!page?.archivedAt || page.archivedAt >= cutoff) {
      return true;
    }
  }

  return false;
}
