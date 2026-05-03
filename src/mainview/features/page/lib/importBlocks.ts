import type { BlockProps } from "@/shared/contracts";
import type { CreateBlockDraft } from "./blockEditingBehavior";
import { normalizeLinkHref } from "@/shared/linkSanitization";

export type ImportInline =
  | { text: string; type: "text" }
  | { children: ImportInline[]; type: "bold" | "italic" }
  | { text: string; type: "code" }
  | { children: ImportInline[]; href: string; type: "link" };

export type ImportBlock =
  | { children: ImportInline[]; type: "paragraph" | "heading_1" | "heading_2" | "heading_3" | "quote" }
  | { children: ImportInline[]; icon: string; type: "callout" }
  | { children: ImportInline[]; depth: number; type: "bulleted_list" }
  | { children: ImportInline[]; depth: number; start: number; type: "numbered_list" }
  | { checked: boolean; children: ImportInline[]; depth: number; type: "todo" }
  | { language?: string; text: string; type: "code" }
  | { type: "divider" };

type InlineMarkDraft = {
  end: number;
  href?: string;
  start: number;
  type: "bold" | "italic" | "code" | "link";
};

export function importBlocksToDrafts(blocks: ImportBlock[]) {
  return blocks.map(importBlockToDraft);
}

export function importBlockToDraft(block: ImportBlock): Required<CreateBlockDraft> {
  if (block.type === "code") {
    return {
      props: block.language ? { language: block.language } : {},
      text: block.text,
      type: "code"
    };
  }

  if (block.type === "divider") {
    return { props: {}, text: "", type: "divider" };
  }

  const inline = flattenImportInline(block.children);
  const props = getBlockBaseProps(block);

  if (inline.marks.length > 0) {
    props.inlineMarks = inline.marks;
  }

  return {
    props,
    text: inline.text,
    type: block.type
  };
}

export function importBlocksToMarkdown(blocks: ImportBlock[]) {
  return blocks.flatMap(importBlockToMarkdownLines).join("\n");
}

export function parseMarkdownInlineText(text: string): ImportInline[] {
  return parseInlineSegment(text);
}

export function plainInlineText(text: string): ImportInline[] {
  return text ? [{ text, type: "text" }] : [];
}

function importBlockToMarkdownLines(block: ImportBlock): string[] {
  switch (block.type) {
    case "heading_1":
      return [`# ${importInlineToMarkdown(block.children)}`];
    case "heading_2":
      return [`## ${importInlineToMarkdown(block.children)}`];
    case "heading_3":
      return [`### ${importInlineToMarkdown(block.children)}`];
    case "paragraph":
      return [importInlineToMarkdown(block.children)];
    case "quote":
      return [`> ${importInlineToMarkdown(block.children)}`];
    case "callout":
      return [`>! ${importInlineToMarkdown(block.children)}`];
    case "bulleted_list":
      return [`${"  ".repeat(block.depth)}- ${importInlineToMarkdown(block.children)}`];
    case "numbered_list":
      return [
        `${"  ".repeat(block.depth)}${block.start}. ${importInlineToMarkdown(block.children)}`
      ];
    case "todo":
      return [
        `${"  ".repeat(block.depth)}- [${block.checked ? "x" : " "}] ${importInlineToMarkdown(block.children)}`
      ];
    case "code":
      return [`\`\`\`${block.language ?? ""}`, block.text, "```"];
    case "divider":
      return ["---"];
  }
}

function importInlineToMarkdown(inlines: ImportInline[]): string {
  return inlines.map(importInlineNodeToMarkdown).join("");
}

function importInlineNodeToMarkdown(inline: ImportInline): string {
  switch (inline.type) {
    case "text":
      return inline.text;
    case "bold":
      return `**${importInlineToMarkdown(inline.children)}**`;
    case "italic":
      return `_${importInlineToMarkdown(inline.children)}_`;
    case "code":
      return `\`${inline.text}\``;
    case "link":
      return `[${importInlineToMarkdown(inline.children)}](${inline.href})`;
  }
}

function flattenImportInline(inlines: ImportInline[]) {
  const marks: InlineMarkDraft[] = [];
  let text = "";

  appendInline(inlines);

  return { marks, text };

  function appendInline(nodes: ImportInline[]) {
    for (const node of nodes) {
      const start = text.length;

      switch (node.type) {
        case "text":
          text += node.text;
          break;
        case "code":
          text += node.text;
          pushMark(start, "code");
          break;
        case "bold":
        case "italic":
          appendInline(node.children);
          pushMark(start, node.type);
          break;
        case "link":
          appendInline(node.children);
          pushMark(start, "link", node.href);
          break;
      }
    }
  }

  function pushMark(
    start: number,
    type: InlineMarkDraft["type"],
    href?: string
  ) {
    if (start >= text.length) {
      return;
    }

    marks.push(
      href
        ? { end: text.length, href, start, type }
        : { end: text.length, start, type }
    );
  }
}

function getBlockBaseProps(block: ImportBlock): BlockProps {
  switch (block.type) {
    case "bulleted_list":
    case "numbered_list":
      return {
        ...(block.depth > 0 ? { depth: block.depth } : {}),
        ...(block.type === "numbered_list" ? { start: block.start } : {})
      };
    case "todo":
      return {
        ...(block.depth > 0 ? { depth: block.depth } : {}),
        checked: block.checked
      };
    case "callout":
      return { icon: block.icon };
    default:
      return {};
  }
}

function parseInlineSegment(text: string): ImportInline[] {
  const nodes: ImportInline[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const token = findNextInlineToken(text, cursor);

    if (!token) {
      nodes.push({ text: text.slice(cursor), type: "text" });
      break;
    }

    if (token.start > cursor) {
      nodes.push({ text: text.slice(cursor, token.start), type: "text" });
    }

    nodes.push(token.node);
    cursor = token.end;
  }

  return nodes.filter((node) => node.type !== "text" || node.text.length > 0);
}

function findNextInlineToken(text: string, from: number) {
  const candidates = [
    findLinkToken(text, from),
    findCodeToken(text, from),
    findWrappedToken(text, from, "**", "bold"),
    findWrappedToken(text, from, "_", "italic")
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return candidates.sort((left, right) => left.start - right.start)[0] ?? null;
}

function findLinkToken(text: string, from: number) {
  const pattern = /\[([^\]]+)]\(([^)\s]+)\)/g;
  pattern.lastIndex = from;
  const match = pattern.exec(text);

  if (!match) {
    return null;
  }

  const href = normalizeLinkHref(match[2]);

  return {
    end: match.index + match[0].length,
    node: href
      ? {
          children: parseInlineSegment(match[1]),
          href,
          type: "link" as const
        }
      : {
          text: match[1],
          type: "text" as const
        },
    start: match.index
  };
}

function findCodeToken(text: string, from: number) {
  const start = text.indexOf("`", from);

  if (start < 0) {
    return null;
  }

  const end = text.indexOf("`", start + 1);

  if (end < 0) {
    return null;
  }

  return {
    end: end + 1,
    node: { text: text.slice(start + 1, end), type: "code" as const },
    start
  };
}

function findWrappedToken(
  text: string,
  from: number,
  marker: string,
  type: "bold" | "italic"
) {
  const start = text.indexOf(marker, from);

  if (start < 0) {
    return null;
  }

  const end = text.indexOf(marker, start + marker.length);

  if (end < 0) {
    return null;
  }

  return {
    end: end + marker.length,
    node: {
      children: parseInlineSegment(text.slice(start + marker.length, end)),
      type
    },
    start
  };
}
