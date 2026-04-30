import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  buildPasteBlockInputs,
  shouldCreateFallbackBlockAfterDelete
} from "./blockBatchActions";

describe("block batch actions", () => {
  test("builds paste inputs that preserve draft order after the anchor block", () => {
    expect(
      buildPasteBlockInputs(block("anchor"), [
        { props: {}, text: "First", type: "paragraph" },
        { props: { checked: false }, text: "Second", type: "todo" }
      ])
    ).toEqual([
      {
        afterBlockId: "anchor",
        pageId: "page-1",
        props: {},
        text: "First",
        type: "paragraph"
      },
      {
        afterBlockId: null,
        pageId: "page-1",
        props: { checked: false },
        text: "Second",
        type: "todo"
      }
    ]);
  });

  test("creates a fallback block only when deletion empties the page", () => {
    expect(shouldCreateFallbackBlockAfterDelete(0, 1)).toBe(false);
    expect(shouldCreateFallbackBlockAfterDelete(1, 3)).toBe(false);
    expect(shouldCreateFallbackBlockAfterDelete(3, 3)).toBe(true);
    expect(shouldCreateFallbackBlockAfterDelete(4, 3)).toBe(true);
  });
});

function block(id: string): Block {
  return {
    createdAt: "2026-04-30T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId: null,
    props: {},
    sortKey: "00000000",
    text: "",
    type: "paragraph",
    updatedAt: "2026-04-30T00:00:00.000Z"
  };
}
