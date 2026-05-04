import { describe, expect, test } from "bun:test";
import { getInlinePageSearchTrigger } from "./inlinePageSearchTrigger";

describe("inline page search trigger", () => {
  test("detects @ trigger at the start of text", () => {
    expect(getInlinePageSearchTrigger("@Road", 5)).toEqual({
      query: "Road",
      triggerChar: "@",
      triggerOffset: 0
    });
  });

  test("detects @ trigger after whitespace without including the whitespace", () => {
    expect(getInlinePageSearchTrigger("See @Road", 9)).toEqual({
      query: "Road",
      triggerChar: "@",
      triggerOffset: 4
    });
  });

  test("detects [[ trigger", () => {
    expect(getInlinePageSearchTrigger("See [[Road", 10)).toEqual({
      query: "Road",
      triggerChar: "[[",
      triggerOffset: 4
    });
  });

  test("ignores @ in the middle of a word", () => {
    expect(getInlinePageSearchTrigger("email@example", 13)).toBeNull();
  });
});
