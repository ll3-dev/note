import type { Block } from "@/shared/contracts";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";

export type CreateBlockInput = {
  afterBlockId?: string | null;
  pageId: string;
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
