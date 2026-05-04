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
import type { Block, MoveBlockInput, MoveBlocksInput } from "@/shared/contracts";

export function moveBlock(
  handle: DatabaseHandle,
  input: MoveBlockInput
): Block {
  const movingBlock = getBlock(handle, input.blockId);
  const nextParentBlockId =
    input.parentBlockId === undefined ? movingBlock.parentBlockId : input.parentBlockId;
  const afterBlock = input.afterBlockId ? getBlock(handle, input.afterBlockId) : null;

  if (
    afterBlock &&
    (afterBlock.id === movingBlock.id ||
      afterBlock.pageId !== movingBlock.pageId ||
      afterBlock.parentBlockId !== nextParentBlockId)
  ) {
    throw new Error("afterBlockId must belong to the same block list");
  }

  if (nextParentBlockId === movingBlock.id) {
    throw new Error("parentBlockId cannot be the moved block");
  }

  runInTransaction(handle, () => {
    capturePageHistoryBeforeChange(handle, movingBlock.pageId);
    const nextIds = getSiblingBlockIds(handle, movingBlock, nextParentBlockId);
    const afterIndex = afterBlock ? nextIds.indexOf(afterBlock.id) : -1;
    const insertIndex = afterBlock ? afterIndex + 1 : 0;

    if (afterBlock && afterIndex < 0) {
      throw new Error("afterBlockId must belong to the same block list");
    }

    nextIds.splice(insertIndex, 0, movingBlock.id);
    rewriteSortKeys(handle, nextIds, movingBlock.id, nextParentBlockId);

    touchPage(handle, movingBlock.pageId);
    syncPageHistoryAfterChange(handle, movingBlock.pageId);
    recordOperation(handle, "block", movingBlock.id, "move", {
      afterBlockId: afterBlock?.id ?? null
    });
  });

  return getBlock(handle, movingBlock.id);
}

export function moveBlocks(
  handle: DatabaseHandle,
  input: MoveBlocksInput
): Block[] {
  const movingBlocks = input.blockIds.map((blockId) => getBlock(handle, blockId));
  const movingBlockIds = movingBlocks.map((block) => block.id);
  const movingBlockIdSet = new Set(movingBlockIds);
  const pageId = movingBlocks[0]?.pageId;

  if (!pageId || movingBlockIdSet.size !== movingBlocks.length) {
    throw new Error("blockIds must be unique");
  }

  if (movingBlocks.some((block) => block.pageId !== pageId)) {
    throw new Error("all moved blocks must belong to the same page");
  }

  const parentBlockId =
    input.parentBlockId === undefined ? movingBlocks[0].parentBlockId : input.parentBlockId;
  const afterBlock = input.afterBlockId ? getBlock(handle, input.afterBlockId) : null;

  if (parentBlockId && movingBlockIdSet.has(parentBlockId)) {
    throw new Error("parentBlockId cannot be a moved block");
  }

  if (
    afterBlock &&
    (movingBlockIdSet.has(afterBlock.id) ||
      afterBlock.pageId !== pageId ||
      afterBlock.parentBlockId !== parentBlockId)
  ) {
    throw new Error("afterBlockId must belong to the same block list");
  }

  runInTransaction(handle, () => {
    capturePageHistoryBeforeChange(handle, pageId);
    const nextIds = getSiblingBlockIdsExcluding(
      handle,
      pageId,
      parentBlockId,
      movingBlockIds
    );
    const afterIndex = afterBlock ? nextIds.indexOf(afterBlock.id) : -1;
    const insertIndex = afterBlock ? afterIndex + 1 : 0;

    if (afterBlock && afterIndex < 0) {
      throw new Error("afterBlockId must belong to the same block list");
    }

    nextIds.splice(insertIndex, 0, ...movingBlockIds);
    rewriteSortKeysForMovedBlocks(handle, nextIds, movingBlockIdSet, parentBlockId);

    touchPage(handle, pageId);
    syncPageHistoryAfterChange(handle, pageId);

    for (const movedBlockId of movingBlockIds) {
      recordOperation(handle, "block", movedBlockId, "move", {
        afterBlockId: afterBlock?.id ?? null
      });
    }
  });

  return movingBlockIds.map((blockId) => getBlock(handle, blockId));
}

function getSiblingBlockIds(
  handle: DatabaseHandle,
  movingBlock: Block,
  parentBlockId: string | null
) {
  const rows = handle.orm
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      and(
        eq(blocks.page_id, movingBlock.pageId),
        getParentBlockCondition(parentBlockId),
        ne(blocks.id, movingBlock.id)
      )
    )
    .orderBy(blocks.sort_key)
    .all();

  return rows.map((row) => row.id);
}

function getSiblingBlockIdsExcluding(
  handle: DatabaseHandle,
  pageId: string,
  parentBlockId: string | null,
  excludedBlockIds: string[]
) {
  const excludedBlockIdSet = new Set(excludedBlockIds);
  const rows = handle.orm
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(eq(blocks.page_id, pageId), getParentBlockCondition(parentBlockId)))
    .orderBy(blocks.sort_key)
    .all();

  return rows
    .map((row) => row.id)
    .filter((blockId) => !excludedBlockIdSet.has(blockId));
}

function rewriteSortKeys(
  handle: DatabaseHandle,
  blockIds: string[],
  movedBlockId: string,
  parentBlockId: string | null
) {
  for (const [index, blockId] of blockIds.entries()) {
    handle.orm
      .update(blocks)
      .set({
        parent_block_id: sql`CASE WHEN ${blocks.id} = ${movedBlockId} THEN ${parentBlockId} ELSE ${blocks.parent_block_id} END`,
        sort_key: sql`printf('%08d', ${index})`,
        updated_at: sql`CASE WHEN ${blocks.id} = ${movedBlockId} THEN CURRENT_TIMESTAMP ELSE ${blocks.updated_at} END`
      })
      .where(eq(blocks.id, blockId))
      .run();
  }
}

function rewriteSortKeysForMovedBlocks(
  handle: DatabaseHandle,
  blockIds: string[],
  movedBlockIds: Set<string>,
  parentBlockId: string | null
) {
  for (const [index, blockId] of blockIds.entries()) {
    const isMovedBlock = movedBlockIds.has(blockId);

    handle.orm
      .update(blocks)
      .set({
        parent_block_id: isMovedBlock
          ? parentBlockId
          : sql`${blocks.parent_block_id}`,
        sort_key: sql`printf('%08d', ${index})`,
        updated_at: isMovedBlock ? sql`CURRENT_TIMESTAMP` : sql`${blocks.updated_at}`
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
