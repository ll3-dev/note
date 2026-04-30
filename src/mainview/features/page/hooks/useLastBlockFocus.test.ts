import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import { shouldCreateBlockAfterBlankClick } from "./useLastBlockFocus";

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
});
