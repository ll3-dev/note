import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  buildBlockTree,
  getBlocksWithDescendants,
  getFollowingDescendants,
  getIndentedSubtreeBlockUpdates,
  getParentBlockOutdentTarget,
  getSubtreeSafeAfterBlockId,
  getVisibleBlocks
} from "./blockTree";

describe("block tree helpers", () => {
  test("builds a parentBlockId tree without relying on flat order", () => {
    const treeBlocks = [
      block("sibling", "paragraph", 0),
      block("child", "paragraph", 0, {}, "callout"),
      block("callout", "callout", 0, { icon: "💡" }),
      block("grandchild", "paragraph", 0, {}, "child")
    ];

    expect(
      buildBlockTree(treeBlocks).map((node) => ({
        children: node.children.map((child) => ({
          children: child.children.map((grandchild) => grandchild.block.id),
          id: child.block.id
        })),
        id: node.block.id
      }))
    ).toEqual([
      {
        children: [
          {
            children: ["grandchild"],
            id: "child"
          }
        ],
        id: "callout"
      },
      {
        children: [],
        id: "sibling"
      }
    ]);
  });

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

  test("finds the parent target for moving a child block out", () => {
    const treeBlocks = [
      block("before", "paragraph", 0),
      block("callout", "callout", 0),
      block("child", "paragraph", 0, {}, "callout"),
      block("after", "paragraph", 0)
    ];

    expect(getParentBlockOutdentTarget(treeBlocks, treeBlocks[2])).toEqual({
      afterBlockId: "callout",
      parentBlockId: null
    });
    expect(getParentBlockOutdentTarget(treeBlocks, treeBlocks[1])).toBeNull();
  });

  test("collects parentBlockId descendants with selected blocks", () => {
    const treeBlocks = [
      block("before", "paragraph", 0),
      block("callout", "callout", 0),
      block("child", "paragraph", 0, {}, "callout"),
      block("grandchild", "paragraph", 0, {}, "child"),
      block("after", "paragraph", 0)
    ];

    expect(getBlocksWithDescendants(treeBlocks, [treeBlocks[1]]).map((item) => item.id))
      .toEqual(["callout", "child", "grandchild"]);
  });

  test("indents selected parentBlockId subtree together", () => {
    const treeBlocks = [
      block("before", "paragraph", 0),
      block("callout", "callout", 0),
      block("child", "paragraph", 0, {}, "callout"),
      block("grandchild", "paragraph", 0, {}, "child")
    ];

    expect(
      getIndentedSubtreeBlockUpdates(treeBlocks, [treeBlocks[1]], "in").map(
        (update) => ({
          id: update.block.id,
          props: update.props
        })
      )
    ).toEqual([
      { id: "callout", props: { depth: 1 } },
      { id: "child", props: { depth: 1 } },
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
  props: Block["props"] = {},
  parentBlockId: string | null = null
): Block {
  return {
    createdAt: "2026-05-01T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId,
    props: depth > 0 ? { ...props, depth } : props,
    sortKey: id,
    text: id,
    type,
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}
