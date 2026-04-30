import { describe, expect, test } from "bun:test";
import {
  parseMarkdownInlineLinks,
  serializeInlineLinks
} from "./markdownInlineLinks";

describe("markdown inline links", () => {
  test("parses markdown links into link inline marks", () => {
    expect(parseMarkdownInlineLinks("Read [docs](https://example.com).")).toEqual({
      props: {
        inlineMarks: [
          { end: 9, href: "https://example.com", start: 5, type: "link" }
        ]
      },
      text: "Read docs."
    });
  });

  test("drops unsafe link hrefs while preserving label text", () => {
    expect(parseMarkdownInlineLinks("[bad](javascript:alert)")).toEqual({
      props: {},
      text: "bad"
    });
  });

  test("serializes link inline marks back to markdown", () => {
    expect(
      serializeInlineLinks("Read docs.", {
        inlineMarks: [
          { end: 9, href: "https://example.com", start: 5, type: "link" }
        ]
      })
    ).toBe("Read [docs](https://example.com).");
  });
});
