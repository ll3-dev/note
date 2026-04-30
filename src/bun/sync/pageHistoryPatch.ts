import { eq } from "drizzle-orm";
import type { Block, Page, PageDocument } from "../../shared/contracts";
import { areBlockPropsEqual } from "../../shared/blockProps";
import { runInTransaction, type DatabaseHandle } from "../database";
import { blocks, pages } from "../schema";
import { listBlocksForPage } from "../repositories/blockReadRepository";

export type PageHistoryDirection = "redo" | "undo";

export function applySelectivePageHistory(
  handle: DatabaseHandle,
  before: PageDocument,
  after: PageDocument,
  direction: PageHistoryDirection
) {
  const from = direction === "undo" ? after : before;
  const to = direction === "undo" ? before : after;

  runInTransaction(handle, () => {
    applyPageFields(handle, before.page, after.page, direction);
    applyBlockDiff(handle, currentBlocks(handle, before.page.id), from, to);
  });
}

function applyPageFields(
  handle: DatabaseHandle,
  before: Page,
  after: Page,
  direction: PageHistoryDirection
) {
  const from = direction === "undo" ? after : before;
  const to = direction === "undo" ? before : after;
  const current = handle.orm.select().from(pages).where(eq(pages.id, before.id)).get();

  if (!current) {
    return;
  }

  const next = {
    archived_at: changed(current.archived_at, from.archivedAt, to.archivedAt),
    cover: changed(current.cover, from.cover, to.cover),
    icon: changed(current.icon, from.icon, to.icon),
    parent_page_id: changed(
      current.parent_page_id,
      from.parentPageId,
      to.parentPageId
    ),
    sort_key: changed(current.sort_key, from.sortKey, to.sortKey),
    title: changed(current.title, from.title, to.title),
    updated_at: changed(current.updated_at, from.updatedAt, to.updatedAt)
  };

  handle.orm.update(pages).set(next).where(eq(pages.id, before.id)).run();
}

function applyBlockDiff(
  handle: DatabaseHandle,
  current: Map<string, Block>,
  from: PageDocument,
  to: PageDocument
) {
  const fromBlocks = blockMap(from.blocks);
  const toBlocks = blockMap(to.blocks);

  for (const block of from.blocks) {
    if (!toBlocks.has(block.id)) {
      deleteBlockIfPresent(handle, current, block.id);
    }
  }

  for (const block of to.blocks) {
    const fromBlock = fromBlocks.get(block.id);
    const currentBlock = current.get(block.id);

    if (!fromBlock && !currentBlock) {
      insertBlockSnapshot(handle, block);
    } else if (fromBlock && currentBlock) {
      updateChangedBlockFields(handle, currentBlock, fromBlock, block);
    }
  }
}

function updateChangedBlockFields(
  handle: DatabaseHandle,
  current: Block,
  from: Block,
  to: Block
) {
  handle.orm
    .update(blocks)
    .set({
      parent_block_id: changed(current.parentBlockId, from.parentBlockId, to.parentBlockId),
      props_json: changedJson(current.props, from.props, to.props),
      sort_key: changed(current.sortKey, from.sortKey, to.sortKey),
      text: changed(current.text, from.text, to.text),
      type: changed(current.type, from.type, to.type),
      updated_at: changed(current.updatedAt, from.updatedAt, to.updatedAt)
    })
    .where(eq(blocks.id, current.id))
    .run();
}

function insertBlockSnapshot(handle: DatabaseHandle, block: Block) {
  handle.orm
    .insert(blocks)
    .values({
      created_at: block.createdAt,
      id: block.id,
      page_id: block.pageId,
      parent_block_id: block.parentBlockId,
      props_json: JSON.stringify(block.props),
      sort_key: block.sortKey,
      text: block.text,
      type: block.type,
      updated_at: block.updatedAt
    })
    .run();
}

function deleteBlockIfPresent(
  handle: DatabaseHandle,
  current: Map<string, Block>,
  blockId: string
) {
  if (!current.has(blockId)) {
    return;
  }

  handle.orm.delete(blocks).where(eq(blocks.id, blockId)).run();
}

function changed<T>(current: T, from: T, to: T) {
  return Object.is(current, from) ? to : current;
}

function changedJson(
  current: Record<string, unknown>,
  from: Record<string, unknown>,
  to: Record<string, unknown>
) {
  return JSON.stringify(areBlockPropsEqual(current, from) ? to : current);
}

function currentBlocks(handle: DatabaseHandle, pageId: string) {
  return blockMap(listBlocksForPage(handle, pageId));
}

function blockMap(items: Block[]) {
  return new Map(items.map((block) => [block.id, block]));
}
