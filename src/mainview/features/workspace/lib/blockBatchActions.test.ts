import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  buildEmptyCalloutFallbackBlockInputs,
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

  test("creates an empty child paragraph when deletion empties a callout", () => {
    const callout = block("callout-1", {
      type: "callout"
    });
    const child = block("child-1", {
      parentBlockId: callout.id
    });

    expect(buildEmptyCalloutFallbackBlockInputs([callout, child], [child]))
      .toEqual([
        {
          afterBlockId: null,
          pageId: "page-1",
          parentBlockId: "callout-1",
          props: {},
          text: "",
          type: "paragraph"
        }
      ]);
  });

  test("does not create a callout fallback while another child remains", () => {
    const callout = block("callout-1", {
      type: "callout"
    });
    const firstChild = block("child-1", {
      parentBlockId: callout.id
    });
    const secondChild = block("child-2", {
      parentBlockId: callout.id
    });

    expect(
      buildEmptyCalloutFallbackBlockInputs(
        [callout, firstChild, secondChild],
        [firstChild]
      )
    ).toEqual([]);
  });
});

function block(id: string, overrides: Partial<Block> = {}): Block {
  return {
    createdAt: "2026-04-30T00:00:00.000Z",
    id,
    pageId: "page-1",
    parentBlockId: null,
    props: {},
    sortKey: "00000000",
    text: "",
    type: "paragraph",
    updatedAt: "2026-04-30T00:00:00.000Z",
    ...overrides
  };
}
