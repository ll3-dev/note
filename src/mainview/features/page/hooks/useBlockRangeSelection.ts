import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent
} from "react";
import type { Block } from "../../../../shared/contracts";

const BLOCK_SELECTION_DRAG_THRESHOLD = 6;

type SelectionBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type SelectionDrag = {
  active: boolean;
  handoffBlockElement: HTMLElement | null;
  originX: number;
  originY: number;
};

type UseBlockRangeSelectionOptions = {
  blocks: Block[];
  onSelectBlockIds: (blockIds: string[]) => void;
};

export function useBlockRangeSelection({
  blocks,
  onSelectBlockIds
}: UseBlockRangeSelectionOptions) {
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const blocksRef = useRef(blocks);
  const selectionDragRef = useRef<SelectionDrag | null>(null);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    document.body.dataset.blockRangeSelecting = selectionBox ? "true" : "false";

    return () => {
      delete document.body.dataset.blockRangeSelecting;
    };
  }, [selectionBox]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const selectionDrag = selectionDragRef.current;

      if (!selectionDrag) {
        return;
      }

      const nextBox = getSelectionBox(
        selectionDrag.originX,
        selectionDrag.originY,
        event.clientX,
        event.clientY
      );

      if (!selectionDrag.active) {
        const distance = Math.hypot(nextBox.width, nextBox.height);
        if (distance < BLOCK_SELECTION_DRAG_THRESHOLD) {
          return;
        }
        if (
          selectionDrag.handoffBlockElement &&
          isPointerInsideBlock(selectionDrag.handoffBlockElement, event)
        ) {
          return;
        }

        selectionDrag.active = true;
      }

      event.preventDefault();
      window.getSelection()?.removeAllRanges();
      setSelectionBox(nextBox);
      onSelectBlockIds(getIntersectingBlockIds(blocksRef.current, nextBox));
    }

    function handleMouseUp(event: MouseEvent) {
      if (selectionDragRef.current?.active) {
        event.preventDefault();
        window.getSelection()?.removeAllRanges();
      }

      selectionDragRef.current = null;
      setSelectionBox(null);
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
  }, [onSelectBlockIds]);

  const beginBlockRangeSelection = useCallback(
    (
      event: ReactMouseEvent<HTMLElement>,
      options?: { handoffBlockElement?: HTMLElement | null }
    ) => {
      if (!canStartBlockRangeSelection(event)) {
        return false;
      }

      selectionDragRef.current = {
        active: false,
        handoffBlockElement: options?.handoffBlockElement ?? null,
        originX: event.clientX,
        originY: event.clientY
      };

      return true;
    },
    []
  );

  return {
    beginBlockRangeSelection,
    isBlockRangeSelecting: Boolean(selectionBox),
    selectionBox
  };
}

function canStartBlockRangeSelection(event: ReactMouseEvent<HTMLElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
    return false;
  }

  if (!(event.target instanceof HTMLElement)) {
    return false;
  }

  return !event.target.closest(
    "button,input,textarea,select,a,[data-block-drag-handle],[data-ignore-block-selection-drag]"
  );
}

function getSelectionBox(
  originX: number,
  originY: number,
  currentX: number,
  currentY: number
): SelectionBox {
  const left = Math.min(originX, currentX);
  const top = Math.min(originY, currentY);

  return {
    height: Math.abs(currentY - originY),
    left,
    top,
    width: Math.abs(currentX - originX)
  };
}

function getIntersectingBlockIds(blocks: Block[], selectionBox: SelectionBox) {
  return blocks
    .filter((block) => {
      const element = document.querySelector<HTMLElement>(
        `[data-block-id="${block.id}"]`
      );

      return element
        ? rectanglesIntersect(selectionBox, element.getBoundingClientRect())
        : false;
    })
    .map((block) => block.id);
}

function rectanglesIntersect(
  selectionBox: SelectionBox,
  blockRect: DOMRect
) {
  return (
    selectionBox.left < blockRect.right &&
    selectionBox.left + selectionBox.width > blockRect.left &&
    selectionBox.top < blockRect.bottom &&
    selectionBox.top + selectionBox.height > blockRect.top
  );
}

function isPointerInsideBlock(blockElement: HTMLElement, event: MouseEvent) {
  const rect = blockElement.getBoundingClientRect();

  return (
    event.clientX >= rect.left - 4 &&
    event.clientX <= rect.right + 4 &&
    event.clientY >= rect.top - 4 &&
    event.clientY <= rect.bottom + 4
  );
}
