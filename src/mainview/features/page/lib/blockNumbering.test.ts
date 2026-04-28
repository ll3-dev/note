import { describe, expect, test } from "bun:test";
import type { Block } from "../../../../shared/contracts";
import {
  getNumberedListMarkers,
  getNumberedListStartForDepth
} from "./blockNumbering";

const baseBlock = {
  createdAt: "2026-04-28T00:00:00.000Z",
  id: "block-1",
  pageId: "page-1",
  parentBlockId: null,
  props: {},
  sortKey: "a0",
  text: "",
  type: "paragraph",
  updatedAt: "2026-04-28T00:00:00.000Z"
} as const satisfies Block;

function block(id: string, props: Block["props"] = {}): Block {
  return {
    ...baseBlock,
    id,
    props,
    type: "numbered_list"
  };
}

describe("block numbering", () => {
  test("keeps manual starts while continuing following numbered blocks", () => {
    const markers = getNumberedListMarkers([
      block("one", { start: 1 }),
      block("two"),
      block("five", { start: 5 }),
      block("six"),
      block("seven")
    ]);

    expect([...markers.values()]).toEqual([1, 2, 5, 6, 7]);
  });

  test("shifts following numbers when a same-start item is inserted", () => {
    const markers = getNumberedListMarkers([
      block("one", { start: 1 }),
      block("two"),
      block("inserted-five", { start: 5 }),
      block("old-five", { start: 5 }),
      block("old-six", { start: 6 }),
      block("old-seven", { start: 7 })
    ]);

    expect([...markers.values()]).toEqual([1, 2, 5, 6, 7, 8]);
  });

  test("resets numbering after a non-numbered block", () => {
    const markers = getNumberedListMarkers([
      block("one"),
      { ...baseBlock, id: "paragraph" },
      block("reset")
    ]);

    expect(markers.get("one")).toBe(1);
    expect(markers.get("reset")).toBe(1);
  });

  test("finds the next marker for an outdented numbered block", () => {
    const blocks = [
      block("parent", { start: 1 }),
      block("nested-one", { depth: 1, start: 1 }),
      block("nested-two", { depth: 1, start: 2 })
    ];

    expect(getNumberedListStartForDepth(blocks, 2, 0)).toBe(2);
  });

  test("starts a new depth sequence when there is no previous peer", () => {
    const blocks = [
      block("parent", { start: 1 }),
      block("second-parent", { start: 2 })
    ];

    expect(getNumberedListStartForDepth(blocks, 1, 1)).toBe(1);
  });
});
