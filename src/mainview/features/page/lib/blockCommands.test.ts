import { describe, expect, test } from "bun:test";
import { getMarkdownShortcut } from "./blockCommands";

describe("block command shortcuts", () => {
  test("converts heading shortcuts into typed blocks", () => {
    expect(getMarkdownShortcut("# ")).toEqual({
      props: {},
      text: "",
      type: "heading_1"
    });
    expect(getMarkdownShortcut("## ")).toEqual({
      props: {},
      text: "",
      type: "heading_2"
    });
  });

  test("converts list and todo shortcuts", () => {
    expect(getMarkdownShortcut("- ")).toEqual({
      props: {},
      text: "",
      type: "bulleted_list"
    });
    expect(getMarkdownShortcut("5. ")).toEqual({
      props: { start: 5 },
      text: "",
      type: "numbered_list"
    });
    expect(getMarkdownShortcut("[] ")).toEqual({
      props: { checked: false },
      text: "",
      type: "todo"
    });
  });

  test("ignores regular paragraph text", () => {
    expect(getMarkdownShortcut("plain text")).toBeNull();
  });
});
