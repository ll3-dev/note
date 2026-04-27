import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import type { DatabaseHandle } from "../database";
import { blocks } from "../schema";
import { getBlock } from "./blockReadRepository";

export function getNextSortKey(
  handle: DatabaseHandle,
  pageId: string,
  parentBlockId: string | null,
  afterBlockId?: string | null
): string {
  if (!afterBlockId) {
    return getTailSortKey(handle, pageId, parentBlockId);
  }

  const afterBlock = getBlock(handle, afterBlockId);
  const nextIndex = Number.parseInt(afterBlock.sortKey, 10) + 1;

  if (
    afterBlock.pageId !== pageId ||
    afterBlock.parentBlockId !== parentBlockId
  ) {
    throw new Error("afterBlockId must belong to the same block list");
  }

  handle.orm
    .update(blocks)
    .set({
      sort_key: sql`printf('%08d', CAST(${blocks.sort_key} AS INTEGER) + 1)`,
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .where(
      and(
        eq(blocks.page_id, pageId),
        getParentBlockCondition(parentBlockId),
        gte(sql`CAST(${blocks.sort_key} AS INTEGER)`, nextIndex)
      )
    )
    .run();

  return makeSortKey(nextIndex);
}

function getTailSortKey(
  handle: DatabaseHandle,
  pageId: string,
  parentBlockId: string | null
) {
  const row = handle.orm
    .select({ count: count() })
    .from(blocks)
    .where(and(eq(blocks.page_id, pageId), getParentBlockCondition(parentBlockId)))
    .get();

  return makeSortKey(row!.count);
}

export function makeSortKey(index: number): string {
  return String(index).padStart(8, "0");
}

function getParentBlockCondition(parentBlockId: string | null) {
  return parentBlockId === null
    ? isNull(blocks.parent_block_id)
    : eq(blocks.parent_block_id, parentBlockId);
}
