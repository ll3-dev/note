import type { Block } from "@/shared/contracts";

export type BlockDropPlacement = "before" | "after";

export type BlockDropTarget = {
  blockId: string;
  placement: BlockDropPlacement;
};

export function getAfterBlockId(
  blocks: Block[],
  draggedBlockId: string,
  targetBlockId: string,
  placement: BlockDropPlacement
): string | null {
  return getAfterBlockIdForMovingBlocks(
    blocks,
    [draggedBlockId],
    targetBlockId,
    placement
  );
}

export function getAfterBlockIdForMovingBlocks(
  blocks: Block[],
  movingBlockIds: string[],
  targetBlockId: string,
  placement: BlockDropPlacement
): string | null {
  const movingBlockIdSet = new Set(movingBlockIds);
  const orderedBlocks = blocks.filter((block) => !movingBlockIdSet.has(block.id));
  const targetIndex = orderedBlocks.findIndex((block) => block.id === targetBlockId);

  if (targetIndex < 0) {
    return null;
  }

  if (placement === "after") {
    return targetBlockId;
  }

  return targetIndex > 0 ? orderedBlocks[targetIndex - 1].id : null;
}

export function getBlocksAfterMove(
  blocks: Block[],
  movingBlockIds: string[],
  afterBlockId: string | null
) {
  const movingBlockIdSet = new Set(movingBlockIds);
  const movingBlocks = blocks.filter((block) => movingBlockIdSet.has(block.id));
  const remainingBlocks = blocks.filter((block) => !movingBlockIdSet.has(block.id));
  const insertIndex =
    afterBlockId === null
      ? 0
      : remainingBlocks.findIndex((block) => block.id === afterBlockId) + 1;

  if (insertIndex < 0) {
    return blocks;
  }

  return [
    ...remainingBlocks.slice(0, insertIndex),
    ...movingBlocks,
    ...remainingBlocks.slice(insertIndex)
  ];
}

export async function moveBlocksSequentially(
  movingBlocks: Block[],
  afterBlockId: string | null,
  onMoveBlock: (block: Block, afterBlockId: string | null) => Promise<void> | void
) {
  let currentAfterBlockId = afterBlockId;

  for (const block of movingBlocks) {
    await onMoveBlock(block, currentAfterBlockId);
    currentAfterBlockId = block.id;
  }
}
