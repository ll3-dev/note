import { describe, expect, test } from "bun:test";
import {
  getBlockSelectAllShortcutIds,
  getSelectedBlockEditTargetId,
  getSelectedBlockShortcutScopeIds,
  shouldIgnoreSelectedBlockShortcutTarget
} from "./useSelectedBlockShortcuts";
import type { PageDocument } from "@/shared/contracts";

describe("selected block shortcuts", () => {
  test("keeps selected block shortcuts active from its editable body", () => {
    const selectedEditable = createClosestTarget({
      "[data-block-id]": { getAttribute: () => "block-1" },
      "input,textarea,select,[contenteditable]": {}
    });

    expect(
      shouldIgnoreSelectedBlockShortcutTarget(selectedEditable, ["block-1"])
    ).toBe(false);
  });

  test("ignores editable targets outside the block selection", () => {
    const otherEditable = createClosestTarget({
      "[data-block-id]": { getAttribute: () => "block-2" },
      "input,textarea,select,[contenteditable]": {}
    });

    expect(
      shouldIgnoreSelectedBlockShortcutTarget(otherEditable, ["block-1"])
    ).toBe(true);
  });

  test("selects the focused block on first select-all shortcut", () => {
    const selectedEditable = createClosestTarget({
      "[data-block-id]": { getAttribute: () => "block-1" },
      "input,textarea,select,[contenteditable]": {}
    });

    expect(getBlockSelectAllShortcutIds(document, [], selectedEditable)).toEqual([
      "block-1"
    ]);
  });

  test("selects every block on second select-all shortcut", () => {
    const selectedEditable = createClosestTarget({
      "[data-block-id]": { getAttribute: () => "block-1" },
      "input,textarea,select,[contenteditable]": {}
    });

    expect(
      getBlockSelectAllShortcutIds(document, ["block-1"], selectedEditable)
    ).toEqual(["block-1", "block-2"]);
  });

  test("finds the block to edit from keyboard selection focus", () => {
    expect(getSelectedBlockEditTargetId(["block-1", "block-2"], "block-1"))
      .toBe("block-1");
    expect(getSelectedBlockEditTargetId(["block-1", "block-2"], null))
      .toBe("block-2");
    expect(getSelectedBlockEditTargetId([], null)).toBeNull();
  });

  test("keeps selected parent shortcuts active from nested child editors", () => {
    const scopedDocument: PageDocument = {
      ...document,
      blocks: [
        {
          ...document.blocks[0],
          id: "callout-1",
          type: "callout"
        },
        {
          ...document.blocks[1],
          id: "child-1",
          parentBlockId: "callout-1"
        }
      ]
    };
    const shortcutScopeIds = getSelectedBlockShortcutScopeIds(scopedDocument, [
      scopedDocument.blocks[0]
    ]);
    const childEditable = createClosestTarget({
      "[data-block-id]": { getAttribute: () => "child-1" },
      "input,textarea,select,[contenteditable]": {}
    });

    expect(shortcutScopeIds).toEqual(["callout-1", "child-1"]);
    expect(
      shouldIgnoreSelectedBlockShortcutTarget(childEditable, shortcutScopeIds)
    ).toBe(false);
  });
});

const document: PageDocument = {
  blocks: [
    {
      createdAt: "2026-04-30T00:00:00.000Z",
      id: "block-1",
      pageId: "page-1",
      parentBlockId: null,
      props: {},
      sortKey: "a",
      text: "First",
      type: "paragraph",
      updatedAt: "2026-04-30T00:00:00.000Z"
    },
    {
      createdAt: "2026-04-30T00:00:00.000Z",
      id: "block-2",
      pageId: "page-1",
      parentBlockId: null,
      props: {},
      sortKey: "b",
      text: "Second",
      type: "paragraph",
      updatedAt: "2026-04-30T00:00:00.000Z"
    }
  ],
  page: {
    archivedAt: null,
    cover: null,
    createdAt: "2026-04-30T00:00:00.000Z",
    icon: null,
    id: "page-1",
    parentPageId: null,
    sortKey: "a",
    title: "Page",
    updatedAt: "2026-04-30T00:00:00.000Z"
  }
};

function createClosestTarget(matches: Record<string, unknown>) {
  return {
    closest: (selector: string) => matches[selector] ?? null
  } as Element;
}
