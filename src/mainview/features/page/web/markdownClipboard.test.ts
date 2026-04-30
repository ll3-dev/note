import { describe, expect, test } from "bun:test";
import {
  getMarkdownClipboardFile,
  isMarkdownClipboardFile,
  readMarkdownFromDataTransfer
} from "./markdownClipboard";

describe("markdown clipboard web adapter", () => {
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

  test("falls back to converted html when markdown text and files are absent", async () => {
    expect(
      await readMarkdownFromDataTransfer(
        dataTransfer({
          "text/html": "<h1>Title</h1><ul><li>Item</li></ul>",
          "text/plain": "Title\nItem"
        }),
        { htmlToMarkdown: () => "# Title\n- Item" }
      )
    ).toBe("# Title\n- Item");
  });
});

function file(name: string, type: string) {
  return { name, type } as File;
}

function dataTransfer(items: Record<string, string>) {
  return {
    files: [],
    getData: (type: string) => items[type] ?? ""
  } as unknown as DataTransfer;
}
