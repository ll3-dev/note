import { describe, expect, test } from "bun:test";
import type { Block } from "../../../../shared/contracts";
import { getAfterBlockIdForMovingBlocks } from "./blockDrag";

const blocks = ["a", "b", "c", "d", "e"].map((id, index) =>
  createBlock(id, index)
);

describe("block drag", () => {
  test("finds an insertion point after removing the moving range", () => {
    expect(
      getAfterBlockIdForMovingBlocks(blocks, ["b", "c"], "e", "after")
    ).toBe("e");
    expect(
      getAfterBlockIdForMovingBlocks(blocks, ["c", "d"], "a", "before")
    ).toBeNull();
    expect(
      getAfterBlockIdForMovingBlocks(blocks, ["b", "c"], "d", "before")
    ).toBe("a");
  });

  test("returns null when the target is inside the moving range", () => {
    expect(
      getAfterBlockIdForMovingBlocks(blocks, ["b", "c"], "b", "after")
    ).toBeNull();
  });
});

function createBlock(id: string, index: number): Block {
  return {
    createdAt: "2026-04-28T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId: null,
    props: {},
    sortKey: String(index).padStart(8, "0"),
    text: id,
    type: "paragraph",
    updatedAt: "2026-04-28T00:00:00.000Z"
  };
}
