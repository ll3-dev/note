import { eq, sql } from "drizzle-orm";
import { runInTransaction, type DatabaseHandle } from "@/bun/database";
import { blocks } from "@/bun/schema";
import { getNextSortKey } from "./blockOrdering";
import { normalizeBlockProps } from "./blockProps";
import { getBlock } from "./blockReadRepository";
import { recordOperation } from "./noteOperations";
import { touchPage } from "./pageTouch";
import {
  deleteBlockFromSearchIndex,
  indexBlock
} from "./searchIndexRepository";
import {
  capturePageHistoryBeforeChange,
  syncPageHistoryAfterChange
} from "@/bun/sync/pageHistory";
import type {
  Block,
  BlockProps,
  BlockType,
  CreateBlockInput,
  CreateBlocksInput,
  DeleteBlockInput,
  DeleteBlocksInput,
  UpdateBlockInput
} from "@/shared/contracts";

export const DEFAULT_BLOCK_TYPE = "paragraph" satisfies BlockType;

export function createBlock(
  handle: DatabaseHandle,
  input: CreateBlockInput
): Block {
  const pageId = input.pageId;
  const parentBlockId = input.parentBlockId ?? null;
  let block: Block | null = null;

  runInTransaction(handle, () => {
    capturePageHistoryBeforeChange(handle, pageId);
    const sortKey = getNextSortKey(
      handle,
      pageId,
      parentBlockId,
      input.afterBlockId
    );

    block = insertBlock(handle, {
      pageId,
      parentBlockId,
      type: input.type ?? DEFAULT_BLOCK_TYPE,
      text: input.text ?? "",
      props: input.props ?? {},
      sortKey
    });

    touchPage(handle, pageId);
    syncPageHistoryAfterChange(handle, pageId);
    recordOperation(handle, "block", block.id, "create", block);
  });

  if (!block) {
    throw new Error("failed to create block");
  }

  return block;
}

export function createBlocks(
  handle: DatabaseHandle,
  input: CreateBlocksInput
): Block[] {
  const firstInput = input.blocks[0];

  if (!firstInput) {
    return [];
  }

  const pageId = firstInput.pageId;
  const createdBlocks: Block[] = [];

  runInTransaction(handle, () => {
    capturePageHistoryBeforeChange(handle, pageId);
    let afterBlockId = firstInput.afterBlockId ?? null;

    for (const blockInput of input.blocks) {
      if (blockInput.pageId !== pageId) {
        throw new Error("batch block creation must target one page");
      }

      const parentBlockId = blockInput.parentBlockId ?? null;
      const block = insertBlock(handle, {
        pageId,
        parentBlockId,
        type: blockInput.type ?? DEFAULT_BLOCK_TYPE,
        text: blockInput.text ?? "",
        props: blockInput.props ?? {},
        sortKey: getNextSortKey(handle, pageId, parentBlockId, afterBlockId)
      });

      createdBlocks.push(block);
      afterBlockId = block.id;
      recordOperation(handle, "block", block.id, "create", block);
    }

    touchPage(handle, pageId);
    syncPageHistoryAfterChange(handle, pageId);
  });

  return createdBlocks;
}

export function updateBlock(
  handle: DatabaseHandle,
  input: UpdateBlockInput
): Block {
  const current = getBlock(handle, input.blockId);
  capturePageHistoryBeforeChange(handle, current.pageId);
  const nextType = input.type ?? current.type;
  const nextText = input.text ?? current.text;
  const nextProps = normalizeBlockProps(input.props ?? current.props, nextText);

  handle.orm
    .update(blocks)
    .set({
      type: nextType,
      text: nextText,
      props_json: JSON.stringify(nextProps),
      updated_at: sql`CURRENT_TIMESTAMP`
    })
    .where(eq(blocks.id, input.blockId))
    .run();

  touchPage(handle, current.pageId);

  const block = getBlock(handle, input.blockId);
  indexBlock(handle, block);
  syncPageHistoryAfterChange(handle, current.pageId);
  recordOperation(handle, "block", block.id, "update", {
    type: nextType,
    text: nextText,
    props: nextProps
  });

  return block;
}

export function deleteBlock(
  handle: DatabaseHandle,
  input: DeleteBlockInput
): { deleted: true } {
  const current = getBlock(handle, input.blockId);

  runInTransaction(handle, () => {
    capturePageHistoryBeforeChange(handle, current.pageId);
    deleteBlockFromSearchIndex(handle, input.blockId);
    handle.orm.delete(blocks).where(eq(blocks.id, input.blockId)).run();
    touchPage(handle, current.pageId);
    syncPageHistoryAfterChange(handle, current.pageId);
    recordOperation(handle, "block", input.blockId, "delete", {});
  });

  return { deleted: true };
}

export function deleteBlocks(
  handle: DatabaseHandle,
  input: DeleteBlocksInput
): { createdBlock?: Block; deleted: true } {
  const firstBlock = getBlock(handle, input.blockIds[0]);
  const pageId = firstBlock.pageId;
  let createdBlock: Block | undefined;

  runInTransaction(handle, () => {
    capturePageHistoryBeforeChange(handle, pageId);
    const blocksToDelete = input.blockIds.map((blockId) => {
      const block = getBlock(handle, blockId);

      if (block.pageId !== pageId) {
        throw new Error("batch block deletion must target one page");
      }

      return block;
    });

    for (const block of blocksToDelete) {
      const blockId = block.id;

      handle.orm.delete(blocks).where(eq(blocks.id, blockId)).run();
      deleteBlockFromSearchIndex(handle, blockId);
      recordOperation(handle, "block", blockId, "delete", {});
    }

    if (input.fallbackBlock) {
      if (input.fallbackBlock.pageId !== pageId) {
        throw new Error("fallback block must target the deleted page");
      }

      createdBlock = insertBlock(handle, {
        pageId,
        parentBlockId: null,
        props: input.fallbackBlock.props ?? {},
        sortKey: getNextSortKey(handle, pageId, null, null),
        text: input.fallbackBlock.text ?? "",
        type: input.fallbackBlock.type ?? DEFAULT_BLOCK_TYPE
      });
      recordOperation(handle, "block", createdBlock.id, "create", createdBlock);
    }

    touchPage(handle, pageId);
    syncPageHistoryAfterChange(handle, pageId);
  });

  return createdBlock ? { createdBlock, deleted: true } : { deleted: true };
}

export function insertBlock(
  handle: DatabaseHandle,
  input: {
    pageId: string;
    parentBlockId: string | null;
    type: BlockType;
    text: string;
    props: BlockProps;
    sortKey: string;
  }
): Block {
  const blockId = crypto.randomUUID();

  handle.orm
    .insert(blocks)
    .values({
      id: blockId,
      page_id: input.pageId,
      parent_block_id: input.parentBlockId,
      type: input.type,
      sort_key: input.sortKey,
      text: input.text,
      props_json: JSON.stringify(normalizeBlockProps(input.props, input.text))
    })
    .run();

  const block = getBlock(handle, blockId);
  indexBlock(handle, block);

  return block;
}
