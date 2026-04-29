import type { BlockDropTarget } from "./blockDrag";

const DRAG_START_DISTANCE = 4;

export type BlockDragMachineState =
  | { status: "idle" }
  | {
      blockId: string;
      originX: number;
      originY: number;
      selectedBlockIds: string[];
      status: "pending";
    }
  | {
      blockId: string;
      clientX: number;
      clientY: number;
      dropTarget: BlockDropTarget | null;
      selectedBlockIds: string[];
      status: "dragging";
    };

export type BlockDragMachineEvent =
  | {
      blockId: string;
      clientX: number;
      clientY: number;
      selectedBlockIds: string[];
      type: "press";
    }
  | { clientX: number; clientY: number; type: "move" }
  | { dropTarget: BlockDropTarget | null; type: "target" }
  | { type: "cancel" }
  | { type: "commit" };

export function transitionBlockDrag(
  state: BlockDragMachineState,
  event: BlockDragMachineEvent
): BlockDragMachineState {
  switch (event.type) {
    case "press":
      return {
        blockId: event.blockId,
        originX: event.clientX,
        originY: event.clientY,
        selectedBlockIds: event.selectedBlockIds,
        status: "pending"
      };
    case "move":
      if (state.status === "dragging") {
        return { ...state, clientX: event.clientX, clientY: event.clientY };
      }

      if (state.status !== "pending") {
        return state;
      }

      if (
        !hasExceededDragStartDistance(
          state.originX,
          state.originY,
          event.clientX,
          event.clientY
        )
      ) {
        return state;
      }

      return {
        blockId: state.blockId,
        clientX: event.clientX,
        clientY: event.clientY,
        dropTarget: null,
        selectedBlockIds: state.selectedBlockIds,
        status: "dragging"
      };
    case "target":
      if (state.status !== "dragging") {
        return state;
      }

      return { ...state, dropTarget: event.dropTarget };
    case "cancel":
    case "commit":
      return { status: "idle" };
  }
}

export function getDraggingBlockId(state: BlockDragMachineState) {
  return state.status === "dragging" ? state.blockId : null;
}

export function getDragDropTarget(state: BlockDragMachineState) {
  return state.status === "dragging" ? state.dropTarget : null;
}

export function getDragPreview(state: BlockDragMachineState) {
  if (state.status !== "dragging") {
    return null;
  }

  return {
    blockId: state.blockId,
    clientX: state.clientX,
    clientY: state.clientY,
    selectedBlockIds: state.selectedBlockIds
  };
}

function hasExceededDragStartDistance(
  originX: number,
  originY: number,
  clientX: number,
  clientY: number
) {
  return (
    Math.abs(clientX - originX) >= DRAG_START_DISTANCE ||
    Math.abs(clientY - originY) >= DRAG_START_DISTANCE
  );
}
