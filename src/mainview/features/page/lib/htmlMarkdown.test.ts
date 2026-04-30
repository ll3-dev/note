import { describe, expect, test } from "bun:test";
import {
  htmlNodesToImportBlocks,
  htmlNodesToMarkdown,
  type HtmlMarkdownNode
} from "./htmlMarkdown";

describe("html markdown conversion", () => {
  test("preserves common document blocks as markdown", () => {
    expect(
      htmlNodesToMarkdown([
        element("h1", [text("Title")]),
        element("p", [
          text("Read "),
          element("a", [text("docs")], { href: "https://example.com" })
        ]),
        element("ul", [
          element("li", [text("Bullet")]),
          element("li", [
            text("Nested"),
            element("ol", [element("li", [text("Numbered")])])
          ])
        ]),
        element("blockquote", [text("Quote")]),
        element("pre", [text("const value = 1;")])
      ])
    ).toBe(
      [
        "# Title",
        "Read [docs](https://example.com)",
        "- Bullet",
        "- Nested",
        "  1. Numbered",
        "> Quote",
        "```",
        "const value = 1;",
        "```"
      ].join("\n")
    );
  });

  test("preserves checkbox list items", () => {
    expect(
      htmlNodesToMarkdown([
        element("ul", [
          element("li", [
            element("input", [], { checked: "", type: "checkbox" }),
            text("Done")
          ]),
          element("li", [
            element("input", [], { type: "checkbox" }),
            text("Open")
          ])
        ])
      ])
    ).toBe(["- [x] Done", "- [ ] Open"].join("\n"));
  });

  test("builds import blocks before Markdown serialization", () => {
    expect(
      htmlNodesToImportBlocks([
        element("p", [
          text("Use "),
          element("strong", [text("bold")]),
          text(" and "),
          element("em", [text("italic")]),
          text(" with "),
          element("code", [text("code")]),
          text(" plus "),
          element("a", [text("docs")], { href: "javascript:alert(1)" })
        ]),
        element("ol", [
          element("li", [text("Second")]),
          element("li", [
            text("Nested"),
            element("ul", [element("li", [text("Bullet")])])
          ])
        ], { start: "2" })
      ])
    ).toEqual([
      {
        children: [
          { text: "Use ", type: "text" },
          { children: [{ text: "bold", type: "text" }], type: "bold" },
          { text: " and ", type: "text" },
          { children: [{ text: "italic", type: "text" }], type: "italic" },
          { text: " with ", type: "text" },
          { text: "code", type: "code" },
          { text: " plus docs", type: "text" }
        ],
        type: "paragraph"
      },
      {
        children: [{ text: "Second", type: "text" }],
        depth: 0,
        start: 2,
        type: "numbered_list"
      },
      {
        children: [{ text: "Nested", type: "text" }],
        depth: 0,
        start: 3,
        type: "numbered_list"
      },
      {
        children: [{ text: "Bullet", type: "text" }],
        depth: 1,
        type: "bulleted_list"
      }
    ]);
  });
});

function element(
  tagName: string,
  children: HtmlMarkdownNode[],
  attributes: Record<string, string> = {}
): HtmlMarkdownNode {
  return {
    attributes,
    children,
    kind: "element",
    tagName
  };
}

function text(value: string): HtmlMarkdownNode {
  return { kind: "text", text: value };
}
