import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  getHandleBlockSelection,
  getKeyboardBlockSelection
} from "./blockSelection";

const blocks = ["a", "b", "c", "d"].map((id) => ({
  createdAt: "2026-04-30T00:00:00.000Z",
  id,
  pageId: "page-1",
  parentBlockId: null,
  props: {},
  sortKey: id,
  text: id,
  type: "paragraph",
  updatedAt: "2026-04-30T00:00:00.000Z"
})) as Block[];

describe("block selection", () => {
  test("keeps the current selection when pressing an already-selected handle", () => {
    expect(getHandleBlockSelection(blocks, ["b", "c"], "b", {})).toEqual([
      "b",
      "c"
    ]);
  });

  test("extends handle selection with Shift", () => {
    expect(
      getHandleBlockSelection(blocks, ["b"], "d", { shiftKey: true })
    ).toEqual(["b", "c", "d"]);
  });

  test("toggles handle selection with command modifiers", () => {
    expect(
      getHandleBlockSelection(blocks, ["b"], "d", { metaKey: true })
    ).toEqual(["b", "d"]);
    expect(
      getHandleBlockSelection(blocks, ["b", "d"], "d", { metaKey: true })
    ).toEqual(["b"]);
  });

  test("does not leave an empty selection when toggling the only selected handle", () => {
    expect(
      getHandleBlockSelection(blocks, ["b"], "b", { metaKey: true })
    ).toEqual(["b"]);
  });

  test("moves a block selection with arrow keys", () => {
    expect(
      getKeyboardBlockSelection(
        blocks,
        { anchorBlockId: "b", focusBlockId: "b", selectedBlockIds: ["b"] },
        "down",
        false
      )
    ).toEqual({
      anchorBlockId: "c",
      focusBlockId: "c",
      selectedBlockIds: ["c"]
    });
  });

  test("extends and shrinks a block selection with shift arrows", () => {
    expect(
      getKeyboardBlockSelection(
        blocks,
        { anchorBlockId: "b", focusBlockId: "b", selectedBlockIds: ["b"] },
        "down",
        true
      )
    ).toEqual({
      anchorBlockId: "b",
      focusBlockId: "c",
      selectedBlockIds: ["b", "c"]
    });

    expect(
      getKeyboardBlockSelection(
        blocks,
        { anchorBlockId: "b", focusBlockId: "c", selectedBlockIds: ["b", "c"] },
        "up",
        true
      )
    ).toEqual({
      anchorBlockId: "b",
      focusBlockId: "b",
      selectedBlockIds: ["b"]
    });
  });
});
