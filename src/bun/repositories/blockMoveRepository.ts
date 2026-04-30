import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { runInTransaction, type DatabaseHandle } from "@/bun/database";
import { blocks } from "@/bun/schema";
import { getBlock } from "./blockReadRepository";
import { recordOperation } from "./noteOperations";
import { touchPage } from "./pageTouch";
import {
  capturePageHistoryBeforeChange,
  syncPageHistoryAfterChange
} from "@/bun/sync/pageHistory";
import type { Block, MoveBlockInput } from "@/shared/contracts";

export function moveBlock(
  handle: DatabaseHandle,
  input: MoveBlockInput
): Block {
  const movingBlock = getBlock(handle, input.blockId);
  const afterBlock = input.afterBlockId ? getBlock(handle, input.afterBlockId) : null;

  if (
    afterBlock &&
    (afterBlock.id === movingBlock.id ||
      afterBlock.pageId !== movingBlock.pageId ||
      afterBlock.parentBlockId !== movingBlock.parentBlockId)
  ) {
    throw new Error("afterBlockId must belong to the same block list");
  }

  runInTransaction(handle, () => {
    capturePageHistoryBeforeChange(handle, movingBlock.pageId);
    const nextIds = getSiblingBlockIds(handle, movingBlock);
    const afterIndex = afterBlock ? nextIds.indexOf(afterBlock.id) : -1;
    const insertIndex = afterBlock ? afterIndex + 1 : 0;

    if (afterBlock && afterIndex < 0) {
      throw new Error("afterBlockId must belong to the same block list");
    }

    nextIds.splice(insertIndex, 0, movingBlock.id);
    rewriteSortKeys(handle, nextIds, movingBlock.id);

    touchPage(handle, movingBlock.pageId);
    syncPageHistoryAfterChange(handle, movingBlock.pageId);
    recordOperation(handle, "block", movingBlock.id, "move", {
      afterBlockId: afterBlock?.id ?? null
    });
  });

  return getBlock(handle, movingBlock.id);
}

function getSiblingBlockIds(handle: DatabaseHandle, movingBlock: Block) {
  const rows = handle.orm
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      and(
        eq(blocks.page_id, movingBlock.pageId),
        getParentBlockCondition(movingBlock.parentBlockId),
        ne(blocks.id, movingBlock.id)
      )
    )
    .orderBy(blocks.sort_key)
    .all();

  return rows.map((row) => row.id);
}

function rewriteSortKeys(
  handle: DatabaseHandle,
  blockIds: string[],
  movedBlockId: string
) {
  for (const [index, blockId] of blockIds.entries()) {
    handle.orm
      .update(blocks)
      .set({
        sort_key: sql`printf('%08d', ${index})`,
        updated_at: sql`CASE WHEN ${blocks.id} = ${movedBlockId} THEN CURRENT_TIMESTAMP ELSE ${blocks.updated_at} END`
      })
      .where(eq(blocks.id, blockId))
      .run();
  }
}

function getParentBlockCondition(parentBlockId: string | null) {
  return parentBlockId === null
    ? isNull(blocks.parent_block_id)
    : eq(blocks.parent_block_id, parentBlockId);
}
