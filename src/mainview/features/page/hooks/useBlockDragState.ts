import { useState, type MouseEvent } from "react";
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
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  function startDrag(block: Block) {
    setDraggedBlockId(block.id);
    setSelectedBlockIds((current) =>
      current.includes(block.id) ? current : [block.id]
    );
  }

  function selectBlock(block: Block, event?: MouseEvent) {
    if (event?.shiftKey && selectedBlockIds.length > 0) {
      selectBlockRange(block);
      return;
    }

    if (event?.metaKey || event?.ctrlKey) {
      toggleBlockSelection(block);
      return;
    }

    setSelectedBlockIds([block.id]);
  }

  function clearBlockSelection() {
    setSelectedBlockIds([]);
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
      setSelectedBlockIds([draggedBlock.id]);
    }

    clearDragState();
  }

  function clearDragState() {
    setDraggedBlockId(null);
    setDropTarget(null);
  }

  function selectBlockRange(block: Block) {
    const anchorId = selectedBlockIds[selectedBlockIds.length - 1];
    const anchorIndex = blocks.findIndex((item) => item.id === anchorId);
    const targetIndex = blocks.findIndex((item) => item.id === block.id);

    if (anchorIndex === -1 || targetIndex === -1) {
      setSelectedBlockIds([block.id]);
      return;
    }

    const [start, end] =
      anchorIndex < targetIndex
        ? [anchorIndex, targetIndex]
        : [targetIndex, anchorIndex];

    setSelectedBlockIds(blocks.slice(start, end + 1).map((item) => item.id));
  }

  function toggleBlockSelection(block: Block) {
    setSelectedBlockIds((current) =>
      current.includes(block.id)
        ? current.filter((blockId) => blockId !== block.id)
        : [...current, block.id]
    );
  }

  return {
    clearBlockSelection,
    clearDragState,
    draggedBlockId,
    dropBlock,
    dropTarget,
    selectBlock,
    selectedBlockIds,
    setDropPlacement,
    startDrag
  };
}
