import {
  importBlocksToDrafts,
  parseMarkdownInlineText,
  type ImportBlock
} from "./importBlocks";

const MAX_MARKDOWN_DEPTH = 6;
const BLOCK_MARKDOWN_PATTERNS = [
  /^#{1,2}\s+/,
  /^\s*[-*]\s+/,
  /^\s*\d+\.\s+/,
  /^\s*>\s+/,
  /^\s*[-*]\s+\[[ xX]\]\s+/,
  /^```\w*/,
  /^---$/
];

export function parseMarkdownToBlockDrafts(markdown: string) {
  return importBlocksToDrafts(parseMarkdownToImportBlocks(markdown));
}

export function parseMarkdownToImportBlocks(markdown: string) {
  const blocks: ImportBlock[] = [];
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  let paragraphLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    const codeFence = /^```(\w*)\s*$/.exec(line);

    if (codeFence) {
      flushParagraph();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({
        ...(codeFence[1] ? { language: codeFence[1] } : {}),
        text: codeLines.join("\n"),
        type: "code"
      });
      continue;
    }

    const blockDraft = parseMarkdownLine(line);

    if (blockDraft) {
      flushParagraph();
      blocks.push(blockDraft);
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return blocks;

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      children: parseMarkdownInlineText(paragraphLines.join("\n")),
      type: "paragraph"
    });
    paragraphLines = [];
  }
}

export function shouldHandleMarkdownPaste(text: string) {
  const normalizedText = text.replace(/\r\n?/g, "\n");

  if (!normalizedText.trim()) {
    return false;
  }

  if (normalizedText.includes("\n")) {
    return true;
  }

  return BLOCK_MARKDOWN_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

function parseMarkdownLine(line: string): ImportBlock | null {
  const heading = /^(#{1,2})\s+(.+)$/.exec(line);

  if (heading) {
    return {
      children: parseMarkdownInlineText(heading[2]),
      type: heading[1].length === 1 ? "heading_1" : "heading_2"
    };
  }

  if (/^---$/.test(line.trim())) {
    return { type: "divider" };
  }

  const todo = /^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);

  if (todo) {
    return {
      checked: todo[2].toLowerCase() === "x",
      children: parseMarkdownInlineText(todo[3]),
      depth: getDepth(todo[1]),
      type: "todo"
    };
  }

  const bullet = /^(\s*)[-*]\s+(.+)$/.exec(line);

  if (bullet) {
    return {
      children: parseMarkdownInlineText(bullet[2]),
      depth: getDepth(bullet[1]),
      type: "bulleted_list"
    };
  }

  const numbered = /^(\s*)(\d+)\.\s+(.+)$/.exec(line);

  if (numbered) {
    return {
      children: parseMarkdownInlineText(numbered[3]),
      depth: getDepth(numbered[1]),
      start: Number(numbered[2]),
      type: "numbered_list"
    };
  }

  const quote = /^>\s+(.+)$/.exec(line);

  return quote
    ? { children: parseMarkdownInlineText(quote[1]), type: "quote" }
    : null;
}

function getDepth(indentation: string) {
  return Math.min(
    MAX_MARKDOWN_DEPTH,
    Math.floor(indentation.replace(/\t/g, "  ").length / 2)
  );
}
