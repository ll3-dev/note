import { describe, expect, test } from "bun:test";
import { areBlockPropsEqual } from "./blockProps";

describe("block props comparison", () => {
  test("compares common primitive block props without stringifying", () => {
    expect(areBlockPropsEqual({ checked: true, depth: 1 }, { checked: true, depth: 1 })).toBe(true);
    expect(areBlockPropsEqual({ checked: true }, { checked: false })).toBe(false);
    expect(areBlockPropsEqual({ start: 1 }, { start: 2 })).toBe(false);
  });

  test("compares inline marks by value", () => {
    expect(
      areBlockPropsEqual(
        { inlineMarks: [{ end: 5, start: 0, type: "bold" }] },
        { inlineMarks: [{ end: 5, start: 0, type: "bold" }] }
      )
    ).toBe(true);
    expect(
      areBlockPropsEqual(
        { inlineMarks: [{ end: 5, start: 0, type: "bold" }] },
        { inlineMarks: [{ end: 4, start: 0, type: "bold" }] }
      )
    ).toBe(false);

    expect(
      areBlockPropsEqual(
        { inlineMarks: [{ end: 5, pageId: "page-1", start: 0, type: "pageLink" }] },
        { inlineMarks: [{ end: 5, pageId: "page-1", start: 0, type: "pageLink" }] }
      )
    ).toBe(true);

    expect(
      areBlockPropsEqual(
        { inlineMarks: [{ end: 5, pageId: "page-1", start: 0, type: "pageLink" }] },
        { inlineMarks: [{ end: 5, pageId: "page-2", start: 0, type: "pageLink" }] }
      )
    ).toBe(false);
  });
});
