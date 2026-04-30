import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Block } from "@/shared/contracts";
import {
  type BlockDropPlacement,
  type BlockDropTarget
} from "@/mainview/features/page/lib/blockDrag";
import {
  transitionBlockDrag,
  type BlockDragMachineState
} from "@/mainview/features/page/lib/blockDragMachine";
import { getDropPlacement } from "@/mainview/features/page/web/blockDragDom";

type UsePointerBlockDragOptions = {
  blocksRef: RefObject<Block[]>;
  dragState: BlockDragMachineState;
  dragStateRef: RefObject<BlockDragMachineState>;
  onDropBlock: (block: Block, placement: BlockDropPlacement) => void;
  setDragState: Dispatch<SetStateAction<BlockDragMachineState>>;
};

export function usePointerBlockDrag({
  blocksRef,
  dragState,
  dragStateRef,
  onDropBlock,
  setDragState
}: UsePointerBlockDragOptions) {
  useEffect(() => {
    if (dragState.status === "idle") {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      setDragState((state) => {
        const movedState = transitionBlockDrag(state, {
          clientX: event.clientX,
          clientY: event.clientY,
          type: "move"
        });

        if (movedState.status !== "dragging") {
          return movedState;
        }

        return transitionBlockDrag(movedState, {
          dropTarget: getDropTargetAtPoint(event.clientX, event.clientY),
          type: "target"
        });
      });
    }

    function handlePointerUp() {
      const state = dragStateRef.current;

      if (state.status === "dragging" && state.dropTarget) {
        const target = blocksRef.current.find(
          (block) => block.id === state.dropTarget?.blockId
        );

        if (target) {
          onDropBlock(target, state.dropTarget.placement);
          return;
        }
      }

      setDragState(transitionBlockDrag(state, { type: "commit" }));
    }

    function handlePointerCancel() {
      setDragState(
        transitionBlockDrag(dragStateRef.current, {
          type: "cancel"
        })
      );
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [blocksRef, dragState.status, dragStateRef, onDropBlock, setDragState]);
}

function getDropTargetAtPoint(clientX: number, clientY: number) {
  const element = document
    .elementsFromPoint(clientX, clientY)
    .map((item) => item.closest<HTMLElement>("[data-block-id]"))
    .find((item): item is HTMLElement => Boolean(item));

  if (!element) {
    return null;
  }

  const blockId = element.dataset.blockId;

  if (!blockId) {
    return null;
  }

  return {
    blockId,
    placement: getDropPlacement(clientY, element)
  } satisfies BlockDropTarget;
}
