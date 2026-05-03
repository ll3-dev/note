import { describe, expect, test } from "bun:test";
import {
  getInlineFormatProps,
  getInlineLinkProps,
  getInlineMarksAtOffset,
  getInlineMarks,
  getInlinePageLinkProps,
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

  test("segments pageLink marks with pageId", () => {
    const props = {
      inlineMarks: [
        { start: 0, end: 5, type: "pageLink", pageId: "page-abc" }
      ]
    };
    const segments = getInlineTextSegments("Hello world", props);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      marks: [],
      pageId: "page-abc",
      text: "Hello"
    });
    expect(segments[1]).toEqual({
      marks: [],
      text: " world"
    });
  });

  test("validates pageLink mark with pageId", () => {
    const marks = getInlineMarks({
      inlineMarks: [
        { start: 0, end: 5, type: "pageLink", pageId: "abc" },
        { start: 0, end: 5, type: "pageLink" },
        { start: 0, end: 5, type: "pageLink", pageId: 123 }
      ]
    });
    expect(marks).toHaveLength(1);
    expect(marks[0].pageId).toBe("abc");
  });

  test("creates pageLink mark via getInlinePageLinkProps", () => {
    const result = getInlinePageLinkProps(
      {},
      { end: 5, start: 0 },
      "page-123"
    );
    expect(result).toEqual({
      inlineMarks: [
        { end: 5, start: 0, type: "pageLink", pageId: "page-123" }
      ]
    });
  });

  test("getInlinePageLinkProps returns null for empty selection", () => {
    expect(getInlinePageLinkProps({}, { end: 0, start: 0 }, "page-123")).toBeNull();
  });

  test("getInlinePageLinkProps returns null for missing pageId", () => {
    expect(getInlinePageLinkProps({}, { end: 5, start: 0 }, "")).toBeNull();
  });

  test("getInlinePageLinkProps replaces existing pageLink on same range", () => {
    const props = {
      inlineMarks: [
        { start: 0, end: 5, type: "pageLink", pageId: "old-page" }
      ]
    };
    const result = getInlinePageLinkProps(props, { end: 5, start: 0 }, "new-page");
    expect(result).toEqual({
      inlineMarks: [
        { end: 5, start: 0, type: "pageLink", pageId: "new-page" }
      ]
    });
  });
});
