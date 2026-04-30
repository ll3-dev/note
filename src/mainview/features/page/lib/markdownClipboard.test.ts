import { describe, expect, test } from "bun:test";
import {
  getMarkdownClipboardFile,
  isMarkdownClipboardFile
} from "./markdownClipboard";

describe("markdown clipboard", () => {
  test("detects markdown files by mime type and extension", () => {
    expect(isMarkdownClipboardFile(file("notes.md", ""))).toBe(true);
    expect(isMarkdownClipboardFile(file("notes.markdown", ""))).toBe(true);
    expect(isMarkdownClipboardFile(file("notes.txt", "text/markdown"))).toBe(true);
    expect(isMarkdownClipboardFile(file("notes.txt", "text/plain"))).toBe(false);
  });

  test("finds the first markdown file from transferred files", () => {
    const markdown = new File(["# Title"], "import.md", {
      type: "text/markdown"
    });

    expect(
      getMarkdownClipboardFile([
        new File(["plain"], "plain.txt", { type: "text/plain" }),
        markdown
      ])
    ).toBe(markdown);
  });
});

function file(name: string, type: string) {
  return { name, type } as File;
}
