import type { DatabaseHandle } from "./database";
import {
  createBlock,
  deleteBlock,
  updateBlock
} from "./repositories/blockRepository";
import { listBlocksForPage } from "./repositories/blockReadRepository";
import { createPage, getPage, listPages } from "./repositories/pageRepository";
import type { GetPageDocumentInput, PageDocument } from "../shared/contracts";

export { createBlock, createPage, deleteBlock, listPages, updateBlock };

export function getPageDocument(
  handle: DatabaseHandle,
  input: GetPageDocumentInput
): PageDocument {
  return {
    page: getPage(handle, input.pageId),
    blocks: listBlocksForPage(handle, input.pageId)
  };
}
