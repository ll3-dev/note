import type { DatabaseHandle } from "./database";
import {
  createBlock,
  createBlocks,
  deleteBlock,
  deleteBlocks,
  updateBlock,
} from "./repositories/blockRepository";
import { moveBlock, moveBlocks } from "./repositories/blockMoveRepository";
import { listBlocksForPage } from "./repositories/blockReadRepository";
import {
  deletePage,
  listArchivedPages,
  purgeExpiredArchivedPages,
  restorePage
} from "./repositories/pageArchiveRepository";
import {
  createPage,
  getPage,
  listPages,
  updatePage,
} from "./repositories/pageRepository";
import { movePage } from "./repositories/pageMoveRepository";
import {
  listBacklinks,
  searchPages,
  searchWorkspace
} from "./repositories/pageLinkRepository";
import {
  redoPageHistory,
  undoPageHistory
} from "./sync/pageHistory";
import type { GetPageDocumentInput, PageDocument } from "@/shared/contracts";

export {
  createBlock,
  createBlocks,
  createPage,
  deleteBlock,
  deleteBlocks,
  deletePage,
  listArchivedPages,
  listPages,
  listBacklinks,
  moveBlock,
  moveBlocks,
  movePage,
  purgeExpiredArchivedPages,
  restorePage,
  searchPages,
  searchWorkspace,
  redoPageHistory,
  undoPageHistory,
  updateBlock,
  updatePage,
};

export function getPageDocument(
  handle: DatabaseHandle,
  input: GetPageDocumentInput,
): PageDocument {
  return {
    page: getPage(handle, input.pageId),
    blocks: listBlocksForPage(handle, input.pageId),
  };
}
