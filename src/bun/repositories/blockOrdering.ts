import type { DatabaseHandle } from "../database";
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

  handle.db
    .query(
      `
      UPDATE blocks
      SET sort_key = printf('%08d', CAST(sort_key AS INTEGER) + 1),
          updated_at = CURRENT_TIMESTAMP
      WHERE page_id = ?
        AND parent_block_id IS ?
        AND CAST(sort_key AS INTEGER) >= ?
      `
    )
    .run(pageId, parentBlockId, nextIndex);

  return makeSortKey(nextIndex);
}

function getTailSortKey(
  handle: DatabaseHandle,
  pageId: string,
  parentBlockId: string | null
) {
  const row = handle.db
    .query(
      `
      SELECT COUNT(*) AS count
      FROM blocks
      WHERE page_id = ?
        AND parent_block_id IS ?
      `
    )
    .get(pageId, parentBlockId) as { count: number };

  return makeSortKey(row.count);
}

export function makeSortKey(index: number): string {
  return String(index).padStart(8, "0");
}
