import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  findBlankClickTargetBlock,
  shouldCreateBlockAfterBlankClick
} from "./useLastBlockFocus";

const baseBlock: Block = {
  createdAt: "2026-04-29T00:00:00.000Z",
  id: "block-1",
  pageId: "page-1",
  parentBlockId: null,
  props: {},
  sortKey: "a0",
  text: "",
  type: "paragraph",
  updatedAt: "2026-04-29T00:00:00.000Z"
};

describe("last block blank click behavior", () => {
  test("reuses an empty editable block", () => {
    expect(shouldCreateBlockAfterBlankClick(baseBlock)).toBe(false);
  });

  test("creates after a filled block or divider", () => {
    expect(
      shouldCreateBlockAfterBlankClick({ ...baseBlock, text: "filled" })
    ).toBe(true);
    expect(
      shouldCreateBlockAfterBlankClick({ ...baseBlock, type: "divider" })
    ).toBe(true);
  });

  test("creates after a callout container even when its own text is empty", () => {
    expect(
      shouldCreateBlockAfterBlankClick({ ...baseBlock, type: "callout" })
    ).toBe(true);
  });

  test("targets the callout container when blank space is below the final callout", () => {
    const callout = { ...baseBlock, id: "callout-1", type: "callout" as const };
    const child = {
      ...baseBlock,
      id: "child-1",
      parentBlockId: callout.id,
      sortKey: "a1"
    };

    expect(
      findBlankClickTargetBlock({
        blocks: [callout, child],
        page: {
          archivedAt: null,
          cover: null,
          createdAt: "2026-04-29T00:00:00.000Z",
          icon: null,
          id: "page-1",
          parentPageId: null,
          sortKey: "a0",
          title: "Page",
          updatedAt: "2026-04-29T00:00:00.000Z"
        }
      })
    ).toBe(callout);
  });
});
