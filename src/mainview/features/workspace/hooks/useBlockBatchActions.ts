import type { Block } from "@/shared/contracts";
import { readBlockClipboardPaste } from "@/mainview/features/page/lib/blockClipboard";
import {
  buildEmptyCalloutFallbackBlockInputs,
  buildPasteBlockInputs,
  shouldCreateFallbackBlockAfterDelete,
  type CreateBlockInput
} from "@/mainview/features/workspace/lib/blockBatchActions";

type UseBlockBatchActionsOptions = {
  clearPendingText: (blockId: string) => void;
  createBlocks: (inputs: CreateBlockInput[]) => Promise<Block[]>;
  deleteBlocksBatch: (
    blocks: Block[],
    fallbackBlock?: CreateBlockInput
  ) => Promise<{ createdBlock?: Block; deleted: true }>;
  flushAllTextDrafts: () => Promise<void>;
  getBlocks: () => Block[];
  getBlocksCount: () => number;
  setFocusBlockId: (blockId: string, placement?: "start" | "end") => void;
};

export function useBlockBatchActions({
  clearPendingText,
  createBlocks,
  deleteBlocksBatch,
  flushAllTextDrafts,
  getBlocks,
  getBlocksCount,
  setFocusBlockId
}: UseBlockBatchActionsOptions) {
  async function duplicateBlocks(blocks: Block[]) {
    if (blocks.length === 0) {
      return;
    }

    await flushAllTextDrafts();
    const createdBlocks = await createBlocks(
      blocks.map((block, index) => ({
        afterBlockId: index === 0 ? blocks[blocks.length - 1].id : null,
        pageId: block.pageId,
        props: block.props,
        text: block.text,
        type: block.type
      }))
    );
    const lastCreatedId = createdBlocks.at(-1)?.id ?? null;

    if (lastCreatedId) {
      setFocusBlockId(lastCreatedId, "end");
    }
  }

  async function pasteBlocksAfter(block: Block) {
    const paste = await readBlockClipboardPaste();

    if (!paste || paste.drafts.length === 0) {
      return [];
    }

    await flushAllTextDrafts();
    return createBlocks(buildPasteBlockInputs(block, paste.drafts));
  }

  async function deleteBlocks(blocks: Block[]) {
    const pageId = blocks[0]?.pageId;
    const currentBlocks = getBlocks();
    const shouldCreateFallbackBlock =
      Boolean(pageId) &&
      shouldCreateFallbackBlockAfterDelete(blocks.length, getBlocksCount());
    const emptyCalloutFallbackBlocks = buildEmptyCalloutFallbackBlockInputs(
      currentBlocks,
      blocks
    );

    await flushAllTextDrafts();
    blocks.forEach((block) => clearPendingText(block.id));

    const result = await deleteBlocksBatch(
      blocks,
      shouldCreateFallbackBlock && pageId
        ? {
            pageId,
            props: {},
            text: "",
            type: "paragraph"
          }
        : undefined
    );

    if (result.createdBlock) {
      setFocusBlockId(result.createdBlock.id, "start");
      return;
    }

    if (emptyCalloutFallbackBlocks.length > 0) {
      const createdBlocks = await createBlocks(emptyCalloutFallbackBlocks);
      const firstCreatedBlock = createdBlocks[0];

      if (firstCreatedBlock) {
        setFocusBlockId(firstCreatedBlock.id, "start");
      }
    }
  }

  return { deleteBlocks, duplicateBlocks, pasteBlocksAfter };
}
