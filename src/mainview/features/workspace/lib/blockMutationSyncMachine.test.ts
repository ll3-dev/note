import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  getBlockMutationSyncState,
  shouldApplyBlockMutationResponse
} from "./blockMutationSyncMachine";

describe("block mutation sync machine", () => {
  test("applies a response when cache is still at the submitted optimistic value", () => {
    const state = getBlockMutationSyncState(block({ text: "a" }), { text: "a" });

    expect(state).toBe("optimistic-current");
    expect(shouldApplyBlockMutationResponse(state)).toBe(true);
  });

  test("drops a stale response when cache has newer typed text", () => {
    const state = getBlockMutationSyncState(block({ text: "ab" }), { text: "a" });

    expect(state).toBe("cache-ahead");
    expect(shouldApplyBlockMutationResponse(state)).toBe(false);
  });

  test("drops a stale props response when inline marks have moved ahead", () => {
    const state = getBlockMutationSyncState(
      block({ props: { inlineMarks: [{ end: 2, start: 0, type: "bold" }] } }),
      { props: { inlineMarks: [{ end: 1, start: 0, type: "bold" }] } }
    );

    expect(state).toBe("cache-ahead");
    expect(shouldApplyBlockMutationResponse(state)).toBe(false);
  });

  test("does not resurrect a missing cached block from a late response", () => {
    const state = getBlockMutationSyncState(null, { text: "a" });

    expect(state).toBe("missing-cache");
    expect(shouldApplyBlockMutationResponse(state)).toBe(false);
  });
});

function block(overrides: Partial<Block>): Block {
  return {
    createdAt: "2026-04-29T00:00:00.000Z",
    id: "block-1",
    pageId: "page-1",
    parentBlockId: null,
    props: {},
    sortKey: "00000000",
    text: "",
    type: "paragraph",
    updatedAt: "2026-04-29T00:00:00.000Z",
    ...overrides
  };
}
