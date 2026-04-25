import type { Block } from "../../../../shared/contracts";

export type BlockDropPlacement = "before" | "after";

export type BlockDropTarget = {
  blockId: string;
  placement: BlockDropPlacement;
};

export function getDropPlacement(
  clientY: number,
  target: HTMLElement
): BlockDropPlacement {
  const rect = target.getBoundingClientRect();

  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

export function getAfterBlockId(
  blocks: Block[],
  draggedBlockId: string,
  targetBlockId: string,
  placement: BlockDropPlacement
): string | null {
  const orderedBlocks = blocks.filter((block) => block.id !== draggedBlockId);
  const targetIndex = orderedBlocks.findIndex((block) => block.id === targetBlockId);

  if (targetIndex < 0) {
    return null;
  }

  if (placement === "after") {
    return targetBlockId;
  }

  return targetIndex > 0 ? orderedBlocks[targetIndex - 1].id : null;
}
