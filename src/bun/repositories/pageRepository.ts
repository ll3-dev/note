import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { runInTransaction, type DatabaseHandle } from "@/bun/database";
import { pages } from "@/bun/schema";
import { DEFAULT_BLOCK_TYPE, insertBlock } from "./blockRepository";
import { listBlocksForPage } from "./blockReadRepository";
import { makeSortKey } from "./blockOrdering";
import { mapPage } from "./noteRows";
import {
  capturePageHistoryBeforeChange,
  syncPageHistoryAfterChange
} from "@/bun/sync/pageHistory";
import type {
  CreatePageInput,
  Page,
  PageDocument,
  UpdatePageInput
} from "@/shared/contracts";

export function listPages(handle: DatabaseHandle): Page[] {
  const rows = handle.orm
    .select()
    .from(pages)
    .where(isNull(pages.archived_at))
    .orderBy(asc(pages.parent_page_id), asc(pages.sort_key), asc(sql`rowid`))
    .all();

  return rows.map(mapPage);
}

export function createPage(
  handle: DatabaseHandle,
  input: CreatePageInput
): PageDocument {
  const title = input.title.trim();

  if (!title) {
    throw new Error("page title must not be empty");
  }

  const pageId = crypto.randomUUID();

  runInTransaction(handle, () => {
    handle.orm
      .insert(pages)
      .values({
        id: pageId,
        parent_page_id: input.parentPageId ?? null,
        sort_key: getTailPageSortKey(handle, input.parentPageId ?? null),
        title
      })
      .run();

    insertBlock(handle, {
      pageId,
      parentBlockId: null,
      type: DEFAULT_BLOCK_TYPE,
      text: "",
      props: {},
      sortKey: makeSortKey(0)
    });
  });

  return {
    page: getPage(handle, pageId),
    blocks: listBlocksForPage(handle, pageId)
  };
}

export function getPage(handle: DatabaseHandle, pageId: string): Page {
  const row = handle.orm
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .get();

  if (!row) {
    throw new Error(`page not found: ${pageId}`);
  }

  return mapPage(row);
}

export function updatePage(
  handle: DatabaseHandle,
  input: UpdatePageInput
): Page {
  if (input.title !== undefined) {
    capturePageHistoryBeforeChange(handle, input.pageId);
    const title = input.title.trim();

    if (!title) {
      throw new Error("page title must not be empty");
    }

    handle.orm
      .update(pages)
      .set({
        title,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(pages.id, input.pageId))
      .run();
    syncPageHistoryAfterChange(handle, input.pageId);
  }

  return getPage(handle, input.pageId);
}

function getTailPageSortKey(handle: DatabaseHandle, parentPageId: string | null) {
  const row = handle.orm
    .select({ count: count() })
    .from(pages)
    .where(and(isNull(pages.archived_at), getParentPageCondition(parentPageId)))
    .get();

  return makeSortKey(row!.count);
}

function getParentPageCondition(parentPageId: string | null) {
  return parentPageId === null
    ? isNull(pages.parent_page_id)
    : eq(pages.parent_page_id, parentPageId);
}
