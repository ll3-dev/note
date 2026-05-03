import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  getBlockDepth,
  getBlockIndentUpdate,
  getMergedBlockUpdate,
  getNextBlockDraft,
  getNumberedListStart,
  getSplitBlockDraft
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
        props: { depth: 2, start: 5 },
        type: "numbered_list"
      })
    ).toEqual({
      props: { depth: 2, start: 6 },
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
    expect(getNextBlockDraft({ ...block, type: "toggle" })).toEqual({
      props: { depth: 1 },
      type: "paragraph"
    });
    expect(getNextBlockDraft({ ...block, type: "heading_1" })).toEqual({
      props: {},
      type: "paragraph"
    });
  });

  test("normalizes numbered list starts", () => {
    expect(getNumberedListStart({ ...block, props: { start: 5 } })).toBe(5);
    expect(getNumberedListStart({ ...block, props: { start: "5" } })).toBe(1);
    expect(getNumberedListStart({ ...block, props: { start: 0 } })).toBe(1);
  });

  test("splits block text and inline marks at the cursor", () => {
    expect(
      getSplitBlockDraft(
        { ...block, props: { inlineMarks: [{ end: 8, start: 2, type: "bold" }] } },
        "hello world",
        { inlineMarks: [{ end: 8, start: 2, type: "bold" }] },
        5
      )
    ).toEqual({
      currentUpdate: {
        props: { inlineMarks: [{ end: 5, start: 2, type: "bold" }] },
        text: "hello"
      },
      nextDraft: {
        props: { inlineMarks: [{ end: 3, start: 0, type: "bold" }] },
        text: " world",
        type: "paragraph"
      }
    });
  });

  test("splits numbered lists into the next displayed marker", () => {
    expect(
      getSplitBlockDraft(
        { ...block, props: { depth: 1, start: 5 }, type: "numbered_list" },
        "first item",
        { depth: 1, start: 5 },
        5,
        7
      ).nextDraft
    ).toEqual({
      props: { depth: 1, start: 8 },
      text: " item",
      type: "numbered_list"
    });
  });

  test("merges block text into the previous block and shifts inline marks", () => {
    expect(
      getMergedBlockUpdate(
        {
          ...block,
          id: "previous",
          props: { inlineMarks: [{ end: 2, start: 0, type: "italic" }] },
          text: "hi"
        },
        {
          ...block,
          id: "current",
          props: { inlineMarks: [{ end: 3, start: 1, type: "code" }] },
          text: " all"
        }
      )
    ).toEqual({
      props: {
        inlineMarks: [
          { end: 2, start: 0, type: "italic" },
          { end: 5, start: 3, type: "code" }
        ]
      },
      text: "hi all"
    });
  });
});
