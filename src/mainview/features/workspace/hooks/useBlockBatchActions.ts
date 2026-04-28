import type { Block } from "../../../../shared/contracts";

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
  deleteBlock: (block: Block) => Promise<unknown>;
  flushAllTextDrafts: () => Promise<void>;
  setFocusBlockId: (blockId: string, placement?: "start" | "end") => void;
};

export function useBlockBatchActions({
  clearPendingText,
  createBlock,
  deleteBlock,
  flushAllTextDrafts,
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

  async function deleteBlocks(blocks: Block[]) {
    await flushAllTextDrafts();

    for (const block of blocks) {
      clearPendingText(block.id);
      await deleteBlock(block);
    }
  }

  return { deleteBlocks, duplicateBlocks };
}
