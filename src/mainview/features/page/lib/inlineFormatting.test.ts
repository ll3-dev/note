import { describe, expect, test } from "bun:test";
import {
  getInlineFormatProps,
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
