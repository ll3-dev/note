import { describe, expect, test } from "bun:test";
import {
  validateCreateBlockInput,
  validateCreatePageInput,
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
