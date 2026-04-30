import type { DatabaseHandle } from "./database";
import {
  createBlock,
  deleteBlock,
  updateBlock,
} from "./repositories/blockRepository";
import { moveBlock } from "./repositories/blockMoveRepository";
import { listBlocksForPage } from "./repositories/blockReadRepository";
import {
  createPage,
  getPage,
  listPages,
  updatePage,
} from "./repositories/pageRepository";
import { movePage } from "./repositories/pageMoveRepository";
import {
  redoPageHistory,
  undoPageHistory
} from "./sync/pageHistory";
import type { GetPageDocumentInput, PageDocument } from "@/shared/contracts";

export {
  createBlock,
  createPage,
  deleteBlock,
  listPages,
  moveBlock,
  movePage,
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
