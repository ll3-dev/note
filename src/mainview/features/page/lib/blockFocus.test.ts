import { describe, expect, test } from "bun:test";
import type { Block, PageDocument } from "@/shared/contracts";
import { findAdjacentFocusableBlock } from "./blockFocus";

function block(
  id: string,
  type: Block["type"] = "paragraph",
  parentBlockId: string | null = null
): Block {
  return {
    createdAt: "2026-05-01T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId,
    props: {},
    sortKey: id,
    text: "",
    type,
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}

function document(blocks: Block[]): PageDocument {
  return {
    blocks,
    page: {
      archivedAt: null,
      cover: null,
      createdAt: "2026-05-01T00:00:00.000Z",
      icon: null,
      id: "page-1",
      parentPageId: null,
      sortKey: "a0",
      title: "Page",
      updatedAt: "2026-05-01T00:00:00.000Z"
    }
  };
}

describe("block focus", () => {
  test("skips divider blocks when finding previous focus target", () => {
    const first = block("first");
    const divider = block("divider", "divider");
    const last = block("last");

    expect(
      findAdjacentFocusableBlock(document([first, divider, last]), last, -1)
    ).toBe(first);
  });

  test("skips divider blocks when finding next focus target", () => {
    const first = block("first");
    const divider = block("divider", "divider");
    const last = block("last");

    expect(
      findAdjacentFocusableBlock(document([first, divider, last]), first, 1)
    ).toBe(last);
  });

  test("returns null when no adjacent focusable block exists", () => {
    const divider = block("divider", "divider");
    const last = block("last");

    expect(findAdjacentFocusableBlock(document([divider, last]), last, -1)).toBeNull();
  });

  test("skips callout container shells when moving out of child blocks", () => {
    const before = block("a-before");
    const callout = block("b-callout", "callout");
    const child = block("c-child", "paragraph", "b-callout");
    const after = block("d-after");

    const pageDocument = document([before, callout, child, after]);

    expect(findAdjacentFocusableBlock(pageDocument, child, -1)).toBe(before);
    expect(findAdjacentFocusableBlock(pageDocument, child, 1)).toBe(after);
  });
});
