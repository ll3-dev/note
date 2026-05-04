import type { Block } from "@/shared/contracts";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";

export type CreateBlockInput = {
  afterBlockId?: string | null;
  pageId: string;
  parentBlockId?: string | null;
  props?: Block["props"];
  text?: string;
  type?: Block["type"];
};

export function buildPasteBlockInputs(
  afterBlock: Block,
  drafts: CreateBlockDraft[]
): CreateBlockInput[] {
  let afterBlockId: string | null = afterBlock.id;

  return drafts.map((draft) => {
    const input = {
      afterBlockId,
      pageId: afterBlock.pageId,
      props: draft.props,
      text: draft.text,
      type: draft.type
    };

    afterBlockId = null;

    return input;
  });
}

export function shouldCreateFallbackBlockAfterDelete(
  deletedBlocksCount: number,
  currentBlocksCount: number
) {
  return deletedBlocksCount > 0 && deletedBlocksCount >= currentBlocksCount;
}

export function buildEmptyCalloutFallbackBlockInputs(
  blocks: Block[],
  deletedBlocks: Block[]
): CreateBlockInput[] {
  const deletedBlockIds = new Set(deletedBlocks.map((block) => block.id));
  const candidateParentIds = new Set(
    deletedBlocks
      .map((block) => block.parentBlockId)
      .filter((parentBlockId): parentBlockId is string => Boolean(parentBlockId))
  );

  return [...candidateParentIds].flatMap((parentBlockId) => {
    const parentBlock = blocks.find((block) => block.id === parentBlockId);

    if (!parentBlock || parentBlock.type !== "callout") {
      return [];
    }

    if (deletedBlockIds.has(parentBlock.id)) {
      return [];
    }

    const hasRemainingChild = blocks.some(
      (block) =>
        block.parentBlockId === parentBlock.id && !deletedBlockIds.has(block.id)
    );

    if (hasRemainingChild) {
      return [];
    }

    return [
      {
        afterBlockId: null,
        pageId: parentBlock.pageId,
        parentBlockId: parentBlock.id,
        props: {},
        text: "",
        type: "paragraph"
      }
    ];
  });
}
