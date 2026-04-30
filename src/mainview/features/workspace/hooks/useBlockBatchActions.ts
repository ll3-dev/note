import type { Block } from "@/shared/contracts";
import { readBlockClipboardPaste } from "@/mainview/features/page/lib/blockClipboard";

type CreateBlockInput = {
  afterBlockId?: string | null;
  pageId: string;
  props?: Block["props"];
  text?: string;
  type?: Block["type"];
};

type UseBlockBatchActionsOptions = {
  clearPendingText: (blockId: string) => void;
  createBlock: (input: CreateBlockInput) => Promise<Block>;
  createBlocks: (inputs: CreateBlockInput[]) => Promise<Block[]>;
  deleteBlock: (block: Block) => Promise<unknown>;
  flushAllTextDrafts: () => Promise<void>;
  getBlocksCount: () => number;
  setFocusBlockId: (blockId: string, placement?: "start" | "end") => void;
};

export function useBlockBatchActions({
  clearPendingText,
  createBlock,
  createBlocks,
  deleteBlock,
  flushAllTextDrafts,
  getBlocksCount,
  setFocusBlockId
}: UseBlockBatchActionsOptions) {
  async function duplicateBlocks(blocks: Block[]) {
    if (blocks.length === 0) {
      return;
    }

    await flushAllTextDrafts();
    let afterBlockId = blocks[blocks.length - 1].id;
    let lastCreatedId: string | null = null;

    for (const block of blocks) {
      const created = await createBlock({
        afterBlockId,
        pageId: block.pageId,
        props: block.props,
        text: block.text,
        type: block.type
      });

      afterBlockId = created.id;
      lastCreatedId = created.id;
    }

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
    let afterBlockId: string | null = block.id;
    const inputs: CreateBlockInput[] = [];

    for (const draft of paste.drafts) {
      inputs.push({
        afterBlockId,
        pageId: block.pageId,
        props: draft.props,
        text: draft.text,
        type: draft.type
      });
      afterBlockId = null;
    }

    return createBlocks(inputs);
  }

  async function deleteBlocks(blocks: Block[]) {
    const pageId = blocks[0]?.pageId;
    const shouldCreateFallbackBlock =
      Boolean(pageId) && blocks.length >= getBlocksCount();

    await flushAllTextDrafts();

    for (const block of blocks) {
      clearPendingText(block.id);
      await deleteBlock(block);
    }

    if (shouldCreateFallbackBlock && pageId) {
      const created = await createBlock({
        pageId,
        props: {},
        text: "",
        type: "paragraph"
      });
      setFocusBlockId(created.id, "start");
    }
  }

  return { deleteBlocks, duplicateBlocks, pasteBlocksAfter };
}
