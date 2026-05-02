import { describe, expect, test } from "bun:test";
import { shouldBlurActiveElementForBlockSelection } from "./blockSelectionFocus";

describe("block selection focus", () => {
  test("blurs editable focus inside a selected block", () => {
    const activeElement = createClosestTarget({
      "[contenteditable]": {},
      "[data-block-id]": { getAttribute: () => "block-1" }
    });

    expect(
      shouldBlurActiveElementForBlockSelection(activeElement, ["block-1"])
    ).toBe(true);
  });

  test("keeps editable focus outside the selected blocks", () => {
    const activeElement = createClosestTarget({
      "[contenteditable]": {},
      "[data-block-id]": { getAttribute: () => "block-2" }
    });

    expect(
      shouldBlurActiveElementForBlockSelection(activeElement, ["block-1"])
    ).toBe(false);
  });

  test("blurs page title focus when blocks are selected", () => {
    const activeElement = createClosestTarget({
      "[data-page-title-editor]": {}
    });

    expect(
      shouldBlurActiveElementForBlockSelection(activeElement, ["block-1"])
    ).toBe(true);
  });

  test("blurs focused selected page link blocks", () => {
    const activeElement = createClosestTarget({
      "[data-block-focus-target]": {},
      "[data-block-id]": { getAttribute: () => "block-1" }
    });

    expect(
      shouldBlurActiveElementForBlockSelection(activeElement, ["block-1"])
    ).toBe(true);
  });
});

function createClosestTarget(matches: Record<string, unknown>) {
  return {
    closest: (selector: string) => matches[selector] ?? null
  } as Element;
}
