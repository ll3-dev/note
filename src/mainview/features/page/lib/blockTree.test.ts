import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  getBlocksWithDescendants,
  getFollowingDescendants,
  getIndentedSubtreeBlockUpdates,
  getSubtreeSafeAfterBlockId,
  getVisibleBlocks
} from "./blockTree";

describe("block tree helpers", () => {
  test("hides descendants of collapsed toggle blocks", () => {
    expect(getVisibleBlocks(blocks).map((block) => block.id)).toEqual([
      "toggle",
      "sibling"
    ]);
  });

  test("collects selected blocks with their following descendants", () => {
    expect(getBlocksWithDescendants(blocks, [blocks[0]]).map((block) => block.id))
      .toEqual(["toggle", "child", "grandchild"]);
  });

  test("returns following descendants until the depth returns", () => {
    expect(getFollowingDescendants(blocks, 0).map((block) => block.id)).toEqual([
      "child",
      "grandchild"
    ]);
  });

  test("rejects moving a subtree after one of its own descendants", () => {
    expect(getSubtreeSafeAfterBlockId(blocks, blocks.slice(0, 3), "child"))
      .toBeUndefined();
    expect(getSubtreeSafeAfterBlockId(blocks, blocks.slice(0, 3), "sibling"))
      .toBe("sibling");
  });

  test("indents a selected subtree together", () => {
    expect(
      getIndentedSubtreeBlockUpdates(blocks, [blocks[3]], "in").map((update) => ({
        id: update.block.id,
        props: update.props
      }))
    ).toEqual([{ id: "sibling", props: { depth: 1 } }]);

    expect(
      getIndentedSubtreeBlockUpdates(blocks, [blocks[1]], "out").map((update) => ({
        id: update.block.id,
        props: update.props
      }))
    ).toEqual([
      { id: "child", props: {} },
      { id: "grandchild", props: { depth: 1 } }
    ]);
  });
});

const blocks = [
  block("toggle", "toggle", 0, { open: false }),
  block("child", "paragraph", 1),
  block("grandchild", "paragraph", 2),
  block("sibling", "paragraph", 0)
] satisfies Block[];

function block(
  id: string,
  type: Block["type"],
  depth: number,
  props: Block["props"] = {}
): Block {
  return {
    createdAt: "2026-05-01T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId: null,
    props: depth > 0 ? { ...props, depth } : props,
    sortKey: id,
    text: id,
    type,
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}
