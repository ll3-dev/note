import { describe, expect, test } from "bun:test";
import { shouldIgnoreSelectedBlockShortcutTarget } from "./useSelectedBlockShortcuts";

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
});

function createClosestTarget(matches: Record<string, unknown>) {
  return {
    closest: (selector: string) => matches[selector] ?? null
  } as Element;
}
