import { describe, expect, test } from "bun:test";
import {
  getDragDropTarget,
  getDragPreview,
  getDraggingBlockId,
  transitionBlockDrag,
  type BlockDragMachineState
} from "./blockDragMachine";

describe("block drag machine", () => {
  test("stays pending until the pointer crosses the drag threshold", () => {
    let state: BlockDragMachineState = { status: "idle" };

    state = transitionBlockDrag(state, {
      blockId: "a",
      clientX: 10,
      clientY: 20,
      selectedBlockIds: ["a"],
      type: "press"
    });
    state = transitionBlockDrag(state, { clientX: 12, clientY: 22, type: "move" });

    expect(state.status).toBe("pending");
    expect(getDraggingBlockId(state)).toBeNull();
  });

  test("enters dragging and tracks a drop target", () => {
    let state = transitionBlockDrag(
      { status: "idle" },
      {
        blockId: "a",
        clientX: 10,
        clientY: 20,
        selectedBlockIds: ["a", "b"],
        type: "press"
      }
    );

    state = transitionBlockDrag(state, { clientX: 10, clientY: 30, type: "move" });
    state = transitionBlockDrag(state, {
      dropTarget: { blockId: "c", placement: "before" },
      type: "target"
    });

    expect(state).toEqual({
      blockId: "a",
      clientX: 10,
      clientY: 30,
      dropTarget: { blockId: "c", placement: "before" },
      selectedBlockIds: ["a", "b"],
      status: "dragging"
    });
    expect(getDragDropTarget(state)).toEqual({
      blockId: "c",
      placement: "before"
    });
    expect(getDragPreview(state)).toEqual({
      blockId: "a",
      clientX: 10,
      clientY: 30,
      selectedBlockIds: ["a", "b"]
    });
  });

  test("commit and cancel return to idle", () => {
    const dragging: BlockDragMachineState = {
      blockId: "a",
      clientX: 10,
      clientY: 20,
      dropTarget: { blockId: "b", placement: "after" },
      selectedBlockIds: ["a"],
      status: "dragging"
    };

    expect(transitionBlockDrag(dragging, { type: "commit" })).toEqual({
      status: "idle"
    });
    expect(transitionBlockDrag(dragging, { type: "cancel" })).toEqual({
      status: "idle"
    });
  });
});
