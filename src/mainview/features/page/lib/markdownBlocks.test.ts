import { describe, expect, test } from "bun:test";
import type { Block } from "@/shared/contracts";
import {
  buildMarkdownPasteDrafts,
  parseMarkdownToBlockDrafts,
  serializePageToMarkdown,
  shouldHandleMarkdownPaste
} from "./markdownBlocks";

const baseBlock = {
  createdAt: "2026-04-28T00:00:00.000Z",
  id: "block-1",
  pageId: "page-1",
  parentBlockId: null,
  sortKey: "a0",
  updatedAt: "2026-04-28T00:00:00.000Z"
} satisfies Omit<Block, "props" | "text" | "type">;

describe("markdown blocks", () => {
  test("parses common Markdown blocks into block drafts", () => {
    expect(
      parseMarkdownToBlockDrafts(
        [
          "# Heading",
          "## Subheading",
          "- Bullet",
          "  - Nested bullet",
          "1. First",
          "> Quote",
          "- [ ] Open task",
          "- [x] Done task",
          "```ts",
          "const value = 1;",
          "```",
          "---",
          "Paragraph [link](https://example.com)"
        ].join("\n")
      )
    ).toEqual([
      { props: {}, text: "Heading", type: "heading_1" },
      { props: {}, text: "Subheading", type: "heading_2" },
      { props: {}, text: "Bullet", type: "bulleted_list" },
      { props: { depth: 1 }, text: "Nested bullet", type: "bulleted_list" },
      { props: { start: 1 }, text: "First", type: "numbered_list" },
      { props: {}, text: "Quote", type: "quote" },
      { props: { checked: false }, text: "Open task", type: "todo" },
      { props: { checked: true }, text: "Done task", type: "todo" },
      { props: { language: "ts" }, text: "const value = 1;", type: "code" },
      { props: {}, text: "", type: "divider" },
      {
        props: {
          inlineMarks: [
            { end: 14, href: "https://example.com", start: 10, type: "link" }
          ]
        },
        text: "Paragraph link",
        type: "paragraph"
      }
    ]);
  });

  test("parses Markdown inline syntax through import block inline nodes", () => {
    expect(
      parseMarkdownToBlockDrafts(
        "**Bold** and _italic_ plus `code` [link](https://example.com)"
      )
    ).toEqual([
      {
        props: {
          inlineMarks: [
            { end: 4, start: 0, type: "bold" },
            { end: 15, start: 9, type: "italic" },
            { end: 25, start: 21, type: "code" },
            { end: 30, href: "https://example.com", start: 26, type: "link" }
          ]
        },
        text: "Bold and italic plus code link",
        type: "paragraph"
      }
    ]);
  });

  test("serializes page blocks back to Markdown", () => {
    expect(
      serializePageToMarkdown({
        blocks: [
          block("heading_1", "Title"),
          block("paragraph", "Intro link", {
            inlineMarks: [
              { end: 10, href: "https://example.com", start: 6, type: "link" }
            ]
          }),
          block("bulleted_list", "Nested", { depth: 1 }),
          block("numbered_list", "Second", { depth: 1, start: 2 }),
          block("todo", "Done", { checked: true }),
          block("quote", "Quote"),
          block("code", "const value = 1;", { language: "ts" }),
          block("divider", "")
        ],
        page: {
          archivedAt: null,
          cover: null,
          createdAt: "2026-04-28T00:00:00.000Z",
          icon: null,
          id: "page-1",
          parentPageId: null,
          sortKey: "a0",
          title: "Page title",
          updatedAt: "2026-04-28T00:00:00.000Z"
        }
      })
    ).toBe(
      [
        "# Title",
        "",
        "Intro [link](https://example.com)",
        "",
        "  - Nested",
        "  2. Second",
        "- [x] Done",
        "> Quote",
        "```ts",
        "const value = 1;",
        "```",
        "---"
      ].join("\n")
    );
  });

  test("builds paste drafts that preserve before and after text", () => {
    expect(
      buildMarkdownPasteDrafts({
        currentBlock: block("paragraph", "Hello world"),
        markdown: ["# Markdown", "- item"].join("\n"),
        selectionEnd: 6,
        selectionStart: 6
      })
    ).toEqual({
      focusDraftIndex: 2,
      update: { props: {}, text: "Hello Markdown", type: "heading_1" },
      append: [
        { props: {}, text: "item", type: "bulleted_list" },
        { props: {}, text: "world", type: "paragraph" }
      ]
    });
  });

  test("keeps single plain text paste on the native text path", () => {
    expect(shouldHandleMarkdownPaste("plain text")).toBe(false);
    expect(shouldHandleMarkdownPaste("# Heading")).toBe(true);
    expect(shouldHandleMarkdownPaste("line one\nline two")).toBe(true);
  });
});

function block(type: Block["type"], text: string, props: Block["props"] = {}) {
  return {
    ...baseBlock,
    id: `${type}-${text}`,
    props,
    text,
    type
  } satisfies Block;
}
