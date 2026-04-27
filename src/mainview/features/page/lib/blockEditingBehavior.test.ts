import { describe, expect, test } from "bun:test";
import type { Block } from "../../../../shared/contracts";
import {
  getBlockDepth,
  getBlockIndentUpdate,
  getNextBlockDraft
} from "./blockEditingBehavior";

const block = {
  createdAt: "2026-04-27T00:00:00.000Z",
  id: "block-1",
  pageId: "page-1",
  parentBlockId: null,
  props: {},
  sortKey: "a0",
  text: "",
  type: "paragraph",
  updatedAt: "2026-04-27T00:00:00.000Z"
} as const satisfies Block;

describe("block editing behavior", () => {
  test("normalizes block depth from props", () => {
    expect(getBlockDepth(block)).toBe(0);
    expect(getBlockDepth({ ...block, props: { depth: 3 } })).toBe(3);
    expect(getBlockDepth({ ...block, props: { depth: 99 } })).toBe(6);
    expect(getBlockDepth({ ...block, props: { depth: "2" } })).toBe(0);
  });

  test("creates indent and outdent prop updates", () => {
    expect(getBlockIndentUpdate(block, "in")).toEqual({
      props: { depth: 1 }
    });
    expect(getBlockIndentUpdate(block, "in", 0)).toBeNull();
    expect(
      getBlockIndentUpdate({ ...block, props: { depth: 1 } }, "in", 1)
    ).toBeNull();
    expect(
      getBlockIndentUpdate({ ...block, props: { depth: 1, checked: true } }, "out")
    ).toEqual({
      props: { checked: true }
    });
  });

  test("continues only block types that should carry to the next block", () => {
    expect(
      getNextBlockDraft({
        ...block,
        props: { depth: 2 },
        type: "numbered_list"
      })
    ).toEqual({
      props: { depth: 2 },
      type: "numbered_list"
    });
    expect(
      getNextBlockDraft({
        ...block,
        props: { checked: true, depth: 1 },
        type: "todo"
      })
    ).toEqual({
      props: { checked: false, depth: 1 },
      type: "todo"
    });
    expect(getNextBlockDraft({ ...block, type: "heading_1" })).toEqual({
      props: {},
      type: "paragraph"
    });
  });
});
