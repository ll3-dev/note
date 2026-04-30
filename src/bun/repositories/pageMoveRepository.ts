import { and, eq, gte, isNull, sql } from "drizzle-orm";
import type { DatabaseHandle } from "@/bun/database";
import { pages } from "@/bun/schema";
import { makeSortKey } from "./blockOrdering";
import { getPage } from "./pageRepository";
import type { MovePageInput, Page } from "@/shared/contracts";

export function movePage(handle: DatabaseHandle, input: MovePageInput): Page {
  const page = getPage(handle, input.pageId);
  const parentPageId = input.parentPageId ?? null;
  const afterPageId = input.afterPageId ?? null;

  validatePageMove(handle, page.id, parentPageId, afterPageId);

  handle.orm
    .update(pages)
    .set({
      parent_page_id: parentPageId,
      sort_key: getNextPageSortKey(handle, parentPageId, afterPageId),
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .where(eq(pages.id, page.id))
    .run();

  return getPage(handle, page.id);
}

function validatePageMove(
  handle: DatabaseHandle,
  pageId: string,
  parentPageId: string | null,
  afterPageId: string | null
) {
  if (parentPageId === pageId) {
    throw new Error("page cannot be moved under itself");
  }

  if (parentPageId && isDescendantPage(handle, parentPageId, pageId)) {
    throw new Error("page cannot be moved under its descendant");
  }

  if (afterPageId && getPage(handle, afterPageId).parentPageId !== parentPageId) {
    throw new Error("afterPageId must belong to the same page list");
  }
}

function getNextPageSortKey(
  handle: DatabaseHandle,
  parentPageId: string | null,
  afterPageId: string | null
) {
  if (!afterPageId) {
    shiftPagesFromIndex(handle, parentPageId, 0);
    return makeSortKey(0);
  }

  const nextIndex = Number.parseInt(getPage(handle, afterPageId).sortKey, 10) + 1;
  shiftPagesFromIndex(handle, parentPageId, nextIndex);
  return makeSortKey(nextIndex);
}

function shiftPagesFromIndex(
  handle: DatabaseHandle,
  parentPageId: string | null,
  index: number
) {
  handle.orm
    .update(pages)
    .set({
      sort_key: sql`printf('%08d', CAST(${pages.sort_key} AS INTEGER) + 1)`,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .where(
      and(
        isNull(pages.archived_at),
        getParentPageCondition(parentPageId),
        gte(sql`CAST(${pages.sort_key} AS INTEGER)`, index)
      )
    )
    .run();
}

function isDescendantPage(
  handle: DatabaseHandle,
  candidatePageId: string,
  ancestorPageId: string
) {
  let currentPage = getPage(handle, candidatePageId);

  while (currentPage.parentPageId) {
    if (currentPage.parentPageId === ancestorPageId) {
      return true;
    }

    currentPage = getPage(handle, currentPage.parentPageId);
  }

  return false;
}

function getParentPageCondition(parentPageId: string | null) {
  return parentPageId === null
    ? isNull(pages.parent_page_id)
    : eq(pages.parent_page_id, parentPageId);
}
