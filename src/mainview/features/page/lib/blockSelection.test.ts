import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import { getHandleBlockSelection } from "./blockSelection";

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
});
