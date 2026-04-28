import { eq, sql } from "drizzle-orm";
import { runInTransaction, type DatabaseHandle } from "../database";
import { blocks } from "../schema";
import { getNextSortKey } from "./blockOrdering";
import { normalizeBlockProps } from "./blockProps";
import { getBlock } from "./blockReadRepository";
import { recordOperation } from "./noteOperations";
import { touchPage } from "./pageTouch";
import {
  capturePageHistoryBeforeChange,
  syncPageHistoryAfterChange
} from "../sync/pageHistory";
import type {
  Block,
  BlockProps,
  BlockType,
  CreateBlockInput,
  DeleteBlockInput,
  UpdateBlockInput
} from "../../shared/contracts";

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

  capturePageHistoryBeforeChange(handle, current.pageId);
  handle.orm.delete(blocks).where(eq(blocks.id, input.blockId)).run();
  touchPage(handle, current.pageId);
  syncPageHistoryAfterChange(handle, current.pageId);
  recordOperation(handle, "block", input.blockId, "delete", {});

  return { deleted: true };
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

  return getBlock(handle, blockId);
}
