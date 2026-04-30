import {
  useCallback,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import type { Block } from "@/shared/contracts";
import {
  getAfterBlockIdForMovingBlocks,
  type BlockDropPlacement
} from "@/mainview/features/page/lib/blockDrag";
import {
  getDragDropTarget,
  getDragPreview,
  getDraggingBlockId,
  transitionBlockDrag,
  type BlockDragMachineState
} from "@/mainview/features/page/lib/blockDragMachine";
import {
  getBlockRangeSelection,
  getHandleBlockSelection,
  getToggledBlockSelection,
  type KeyboardBlockSelectionResult
} from "@/mainview/features/page/lib/blockSelection";
import { getDragPreviewOffset } from "@/mainview/features/page/web/blockDragDom";
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
  const [selectionAnchorBlockId, setSelectionAnchorBlockId] = useState<string | null>(null);
  const [selectionFocusBlockId, setSelectionFocusBlockId] = useState<string | null>(null);
  const blocksRef = useRef(blocks);
  const dragStateRef = useRef(dragState);
  const {
    beginBlockRangeSelection, consumeCompletedBlockRangeSelection,
    isBlockRangeSelecting, selectionBox
  } = useBlockRangeSelection({
    blocks,
    onSelectBlockIds: (blockIds) => setBlockSelection(blockIds)
  });

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

      setBlockSelection(movingBlocks.map((block) => block.id));
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

    const nextSelectedBlockIds = getPointerBlockSelection(block, event);
    const previewOffset = getDragPreviewOffset(event);

    setBlockSelection(nextSelectedBlockIds, block.id, block.id);
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
      const anchorBlockId = selectionAnchorBlockId ?? selectedBlockIds.at(-1) ?? block.id;
      setBlockSelection(
        getBlockRangeSelection(blocks, [anchorBlockId], block.id),
        anchorBlockId,
        block.id
      );
      return;
    }

    if (event?.metaKey || event?.ctrlKey) {
      setBlockSelection(
        getToggledBlockSelection(selectedBlockIds, block.id),
        block.id,
        block.id
      );
      return;
    }

    setBlockSelection([block.id], block.id, block.id);
  }

  function getPointerBlockSelection(
    block: Block,
    event: ReactPointerEvent<HTMLElement>
  ) {
    return getHandleBlockSelection(blocks, selectedBlockIds, block.id, event);
  }

  function clearBlockSelection() {
    setSelectedBlockIds([]);
    setSelectionAnchorBlockId(null);
    setSelectionFocusBlockId(null);
  }

  function setBlockSelection(
    blockIds: string[],
    anchorBlockId = blockIds[0] ?? null,
    focusBlockId = blockIds.at(-1) ?? null
  ) {
    setSelectedBlockIds(blockIds);
    setSelectionAnchorBlockId(anchorBlockId);
    setSelectionFocusBlockId(focusBlockId);
  }

  function applyKeyboardBlockSelection(selection: KeyboardBlockSelectionResult) {
    setBlockSelection(
      selection.selectedBlockIds,
      selection.anchorBlockId,
      selection.focusBlockId
    );
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
    selectionAnchorBlockId,
    selectionFocusBlockId,
    applyKeyboardBlockSelection,
    setBlockSelection,
    selectedBlockIds,
    selectionBox,
    setDropPlacement,
    startDrag
  };
}
