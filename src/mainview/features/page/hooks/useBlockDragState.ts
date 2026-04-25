import { useState } from "react";
import type { Block } from "../../../../shared/contracts";
import {
  getAfterBlockId,
  type BlockDropPlacement,
  type BlockDropTarget
} from "../lib/blockDrag";

type UseBlockDragStateOptions = {
  blocks: Block[];
  onMoveBlock: (block: Block, afterBlockId: string | null) => void;
};

export function useBlockDragState({
  blocks,
  onMoveBlock
}: UseBlockDragStateOptions) {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<BlockDropTarget | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  function startDrag(block: Block) {
    setDraggedBlockId(block.id);
    setSelectedBlockId(block.id);
  }

  function selectBlock(block: Block) {
    setSelectedBlockId(block.id);
  }

  function setDropPlacement(block: Block, placement: BlockDropPlacement) {
    setDropTarget({ blockId: block.id, placement });
  }

  function dropBlock(target: Block, placement: BlockDropPlacement) {
    if (!draggedBlockId || draggedBlockId === target.id) {
      clearDragState();
      return;
    }

    const draggedBlock = blocks.find((block) => block.id === draggedBlockId);

    if (!draggedBlock) {
      clearDragState();
      return;
    }

    const afterBlockId = getAfterBlockId(
      blocks,
      draggedBlock.id,
      target.id,
      placement
    );

    if (afterBlockId !== draggedBlock.id) {
      onMoveBlock(draggedBlock, afterBlockId);
      setSelectedBlockId(draggedBlock.id);
    }

    clearDragState();
  }

  function clearDragState() {
    setDraggedBlockId(null);
    setDropTarget(null);
  }

  return {
    clearDragState,
    draggedBlockId,
    dropBlock,
    dropTarget,
    selectBlock,
    selectedBlockId,
    setDropPlacement,
    startDrag
  };
}
