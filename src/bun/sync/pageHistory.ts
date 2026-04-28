import { eq, inArray } from "drizzle-orm";
import type * as Automerge from "@automerge/automerge";
import {
  createAutomergePageDocument,
  toPageDocument,
  type AutomergePageDocument
} from "../../shared/automerge/pageDocument";
import type { PageDocument, PageHistoryInput } from "../../shared/contracts";
import { runInTransaction, type DatabaseHandle } from "../database";
import { blocks, pages } from "../schema";
import { listBlocksForPage } from "../repositories/blockReadRepository";
import { mapPage } from "../repositories/noteRows";

type PageDoc = Automerge.Doc<AutomergePageDocument>;

type PageHistoryState = {
  current: PageDoc;
  redoStack: PageDoc[];
  undoStack: PageDoc[];
};

const histories = new Map<string, PageHistoryState>();

export function capturePageHistoryBeforeChange(
  handle: DatabaseHandle,
  pageId: string
) {
  const state = getHistoryState(handle, pageId);
  histories.set(pageId, {
    ...state,
    redoStack: [],
    undoStack: [...state.undoStack, state.current]
  });
}

export function syncPageHistoryAfterChange(
  handle: DatabaseHandle,
  pageId: string
) {
  const state = getHistoryState(handle, pageId);
  histories.set(pageId, {
    ...state,
    current: createAutomergePageDocument(getPageDocumentSnapshot(handle, pageId))
  });
}

export function undoPageHistory(
  handle: DatabaseHandle,
  input: PageHistoryInput
): PageDocument | null {
  const state = getHistoryState(handle, input.pageId);
  const previous = state.undoStack.at(-1);

  if (!previous) {
    return null;
  }

  const current = snapshot(handle, input.pageId);
  histories.set(input.pageId, {
    current: previous,
    redoStack: [...state.redoStack, current],
    undoStack: state.undoStack.slice(0, -1)
  });

  return applyPageDocumentSnapshot(handle, toPageDocument(previous));
}

export function redoPageHistory(
  handle: DatabaseHandle,
  input: PageHistoryInput
): PageDocument | null {
  const state = getHistoryState(handle, input.pageId);
  const next = state.redoStack.at(-1);

  if (!next) {
    return null;
  }

  const current = snapshot(handle, input.pageId);
  histories.set(input.pageId, {
    current: next,
    redoStack: state.redoStack.slice(0, -1),
    undoStack: [...state.undoStack, current]
  });

  return applyPageDocumentSnapshot(handle, toPageDocument(next));
}

function getHistoryState(handle: DatabaseHandle, pageId: string) {
  const state = histories.get(pageId);

  if (state) {
    return state;
  }

  const nextState = {
    current: snapshot(handle, pageId),
    redoStack: [],
    undoStack: []
  };
  histories.set(pageId, nextState);
  return nextState;
}

function snapshot(handle: DatabaseHandle, pageId: string) {
  return createAutomergePageDocument(getPageDocumentSnapshot(handle, pageId));
}

function applyPageDocumentSnapshot(
  handle: DatabaseHandle,
  document: PageDocument
) {
  runInTransaction(handle, () => {
    restorePage(handle, document);
    restoreBlocks(handle, document);
  });

  return getPageDocumentSnapshot(handle, document.page.id);
}

function restorePage(handle: DatabaseHandle, document: PageDocument) {
  handle.orm
    .update(pages)
    .set({
      archived_at: document.page.archivedAt,
      cover: document.page.cover,
      icon: document.page.icon,
      parent_page_id: document.page.parentPageId,
      sort_key: document.page.sortKey,
      title: document.page.title,
      updated_at: document.page.updatedAt
    })
    .where(eq(pages.id, document.page.id))
    .run();
}

function restoreBlocks(handle: DatabaseHandle, document: PageDocument) {
  const removedIds = removedBlockIds(handle, document);

  if (removedIds.length > 0) {
    handle.orm
      .delete(blocks)
      .where(inArray(blocks.id, removedIds))
      .run();
  }

  for (const block of document.blocks) {
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
      .onConflictDoUpdate({
        set: {
          parent_block_id: block.parentBlockId,
          props_json: JSON.stringify(block.props),
          sort_key: block.sortKey,
          text: block.text,
          type: block.type,
          updated_at: block.updatedAt
        },
        target: blocks.id
      })
      .run();
  }
}

function removedBlockIds(handle: DatabaseHandle, document: PageDocument) {
  const nextBlockIds = new Set(document.blocks.map((block) => block.id));
  return listBlocksForPage(handle, document.page.id)
    .filter((block) => !nextBlockIds.has(block.id))
    .map((block) => block.id);
}

function getPageDocumentSnapshot(
  handle: DatabaseHandle,
  pageId: string
): PageDocument {
  const pageRow = handle.orm.select().from(pages).where(eq(pages.id, pageId)).get();

  if (!pageRow) {
    throw new Error(`page not found: ${pageId}`);
  }

  return {
    blocks: listBlocksForPage(handle, pageId),
    page: mapPage(pageRow)
  };
}
