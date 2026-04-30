import { describe, expect, test } from "bun:test";
import {
  getInlineFormatProps,
  getInlineLinkProps,
  getInlineMarksAtOffset,
  getInlineTextSegments
} from "./inlineFormatting";

describe("inline formatting", () => {
  test("stores selected text formatting as inline marks", () => {
    expect(
      getInlineFormatProps("format-bold", {}, { end: 5, start: 0 })
    ).toEqual({
      inlineMarks: [{ end: 5, start: 0, type: "bold" }]
    });
  });

  test("splits text into marked viewer segments", () => {
    expect(
      getInlineTextSegments("Hello world", {
        inlineMarks: [
          { end: 5, start: 0, type: "bold" },
          { end: 11, start: 6, type: "code" }
        ]
      })
    ).toEqual([
      { marks: ["bold"], text: "Hello" },
      { marks: [], text: " " },
      { marks: ["code"], text: "world" }
    ]);
  });

  test("keeps link hrefs on marked viewer segments", () => {
    expect(
      getInlineTextSegments("Read docs", {
        inlineMarks: [
          { end: 9, href: "https://example.com", start: 5, type: "link" }
        ]
      })
    ).toEqual([
      { marks: [], text: "Read " },
      { href: "https://example.com", marks: [], text: "docs" }
    ]);
  });

  test("stores a sanitized link mark for the selected text", () => {
    expect(
      getInlineLinkProps({}, { end: 9, start: 5 }, " https://example.com ")
    ).toEqual({
      inlineMarks: [
        { end: 9, href: "https://example.com", start: 5, type: "link" }
      ]
    });

    expect(
      getInlineLinkProps({}, { end: 9, start: 5 }, "javascript:alert(1)")
    ).toBeNull();
  });

  test("reads active marks from the caret offset", () => {
    const props = {
      inlineMarks: [
        { end: 5, start: 0, type: "bold" },
        { end: 11, start: 6, type: "code" }
      ]
    };

    expect(getInlineMarksAtOffset(props, 3)).toEqual(["bold"]);
    expect(getInlineMarksAtOffset(props, 6)).toEqual([]);
    expect(getInlineMarksAtOffset(props, 11)).toEqual(["code"]);
  });
});
