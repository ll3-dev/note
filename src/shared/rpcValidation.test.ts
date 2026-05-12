import { describe, expect, test } from "bun:test";
import {
  validateCreateBlockInput,
  validateCreatePageInput,
  validateMoveBlocksInput,
  validateUpdateBlockInput
} from "./rpcValidation";

describe("RPC input validation", () => {
  test("accepts expected page and block inputs", () => {
    expect(validateCreatePageInput({ title: "Inbox" })).toEqual({
      parentPageId: null,
      title: "Inbox"
    });
    expect(
      validateCreateBlockInput({
        pageId: "page-1",
        text: "Minor heading",
        type: "heading_3"
      })
    ).toEqual({
      afterBlockId: null,
      pageId: "page-1",
      parentBlockId: null,
      text: "Minor heading",
      type: "heading_3"
    });
    expect(
      validateCreateBlockInput({
        pageId: "page-1",
        props: { icon: "💡" },
        text: "Call this out",
        type: "callout"
      })
    ).toEqual({
      afterBlockId: null,
      pageId: "page-1",
      parentBlockId: null,
      props: { icon: "💡" },
      text: "Call this out",
      type: "callout"
    });
    expect(
      validateCreateBlockInput({
        pageId: "page-1",
        props: { checked: true },
        text: "Task",
        type: "todo"
      })
    ).toEqual({
      afterBlockId: null,
      pageId: "page-1",
      parentBlockId: null,
      props: { checked: true },
      text: "Task",
      type: "todo"
    });
    expect(
      validateUpdateBlockInput({
        blockId: "block-1",
        props: { icon: "💡" },
        type: "callout"
      })
    ).toEqual({
      blockId: "block-1",
      props: { icon: "💡" },
      type: "callout"
    });
    expect(
      validateMoveBlocksInput({
        afterBlockId: "block-4",
        blockIds: ["block-2", "block-3"],
        parentBlockId: null
      })
    ).toEqual({
      afterBlockId: "block-4",
      blockIds: ["block-2", "block-3"],
      parentBlockId: null
    });
  });

  test("rejects invalid block types", () => {
    expect(() =>
      validateUpdateBlockInput({
        blockId: "block-1",
        type: "script"
      })
    ).toThrow("block type is invalid");
  });

  test("rejects oversized text and props payloads", () => {
    expect(() =>
      validateUpdateBlockInput({
        blockId: "block-1",
        text: "x".repeat(100_001)
      })
    ).toThrow("text is too long");

    expect(() =>
      validateUpdateBlockInput({
        blockId: "block-1",
        props: { value: "x".repeat(20_000) }
      })
    ).toThrow("props payload is too large");
  });
});
