import {
  useCallback,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import type { Block } from "../../../../shared/contracts";
import {
  getAfterBlockIdForMovingBlocks,
  getDragPreviewOffset,
  type BlockDropPlacement
} from "../lib/blockDrag";
import {
  getDragDropTarget,
  getDragPreview,
  getDraggingBlockId,
  transitionBlockDrag,
  type BlockDragMachineState
} from "../lib/blockDragMachine";
import {
  getBlockRangeSelection,
  getToggledBlockSelection
} from "../lib/blockSelection";
import { useBlockRangeSelection } from "./useBlockRangeSelection";
import { usePointerBlockDrag } from "./usePointerBlockDrag";

type UseBlockDragStateOptions = {
  blocks: Block[];
  onMoveBlocks: (
    blocks: Block[],
    afterBlockId: string | null
  ) => Promise<void> | void;
};

export function useBlockDragState({
  blocks,
  onMoveBlocks
}: UseBlockDragStateOptions) {
  const [dragState, setDragState] = useState<BlockDragMachineState>({
    status: "idle"
  });
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const blocksRef = useRef(blocks);
  const dragStateRef = useRef(dragState);
  const {
    beginBlockRangeSelection, consumeCompletedBlockRangeSelection,
    isBlockRangeSelecting, selectionBox
  } = useBlockRangeSelection({ blocks, onSelectBlockIds: setSelectedBlockIds });

  blocksRef.current = blocks;
  dragStateRef.current = dragState;

  const dropBlock = useCallback(
    (target: Block, placement: BlockDropPlacement) => {
      const draggedBlockId = getDraggingBlockId(dragStateRef.current);

      if (!draggedBlockId || draggedBlockId === target.id) {
        clearDragState();
        return;
      }

      const draggedBlock = blocksRef.current.find(
        (block) => block.id === draggedBlockId
      );

      if (!draggedBlock) {
        clearDragState();
        return;
      }

      const movingBlocks = getMovingBlocks(draggedBlock);

      if (movingBlocks.some((block) => block.id === target.id)) {
        clearDragState();
        return;
      }

      const afterBlockId = getAfterBlockIdForMovingBlocks(
        blocksRef.current,
        movingBlocks.map((block) => block.id),
        target.id,
        placement
      );

      setSelectedBlockIds(movingBlocks.map((block) => block.id));
      void onMoveBlocks(movingBlocks, afterBlockId);

      clearDragState();
    },
    [selectedBlockIds]
  );

  usePointerBlockDrag({
    blocksRef,
    dragState,
    dragStateRef,
    onDropBlock: dropBlock,
    setDragState
  });

  function startDrag(_block: Block, event?: ReactDragEvent<HTMLElement>) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function pressBlockDragHandle(
    block: Block,
    event: ReactPointerEvent<HTMLElement>
  ) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const nextSelectedBlockIds = selectedBlockIds.includes(block.id)
      ? selectedBlockIds
      : [block.id];
    const previewOffset = getDragPreviewOffset(event);

    setSelectedBlockIds(nextSelectedBlockIds);
    setDragState(
      transitionBlockDrag(dragStateRef.current, {
        blockId: block.id,
        clientX: event.clientX,
        clientY: event.clientY,
        previewOffsetX: previewOffset.x,
        previewOffsetY: previewOffset.y,
        selectedBlockIds: nextSelectedBlockIds,
        type: "press"
      })
    );
  }

  function selectBlock(block: Block, event?: ReactMouseEvent) {
    if (event?.shiftKey && selectedBlockIds.length > 0) {
      setSelectedBlockIds(
        getBlockRangeSelection(blocks, selectedBlockIds, block.id)
      );
      return;
    }

    if (event?.metaKey || event?.ctrlKey) {
      setSelectedBlockIds(getToggledBlockSelection(selectedBlockIds, block.id));
      return;
    }

    setSelectedBlockIds([block.id]);
  }

  function clearBlockSelection() {
    setSelectedBlockIds([]);
  }

  function setDropPlacement(block: Block, placement: BlockDropPlacement) {
    setDragState((state) =>
      transitionBlockDrag(state, {
        dropTarget: { blockId: block.id, placement },
        type: "target"
      })
    );
  }

  function clearDragState() {
    setDragState(transitionBlockDrag(dragStateRef.current, { type: "cancel" }));
  }

  function getMovingBlocks(draggedBlock: Block) {
    if (!selectedBlockIds.includes(draggedBlock.id)) {
      return [draggedBlock];
    }

    return blocksRef.current.filter((block) => selectedBlockIds.includes(block.id));
  }

  return {
    beginBlockSelectionDrag: beginBlockRangeSelection,
    clearBlockSelection,
    clearDragState,
    consumeCompletedBlockRangeSelection,
    draggedBlockId: getDraggingBlockId(dragState),
    dragPreview: getDragPreview(dragState),
    dropBlock,
    dropTarget: getDragDropTarget(dragState),
    isBlockRangeSelecting,
    pressBlockDragHandle,
    selectBlock,
    selectedBlockIds,
    selectionBox,
    setDropPlacement,
    startDrag
  };
}
