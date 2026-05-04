import {
  importBlocksToDrafts,
  parseMarkdownInlineText,
  type ImportBlock
} from "./importBlocks";

const MAX_MARKDOWN_DEPTH = 6;
const BLOCK_MARKDOWN_PATTERNS = [
  /^#{1,6}\s+/,
  /^\s*[-*+]\s+/,
  /^\s*\d+\.\s+/,
  /^\s*>!\s+/,
  /^\s*>\s+/,
  /^\s*[-*]\s+\[[ xX]\]\s+/,
  /^[`~]{3}[\w-]*/,
  /^[-*_]\s*[-*_]\s*[-*_][\s-*_]*$/,
  /^!\[[^\]]*]\([^)]+\)$/
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

    const codeFence = /^(```|~~~)([\w-]*)\s*$/.exec(line);

    if (codeFence) {
      flushParagraph();
      const codeLines: string[] = [];
      index += 1;

      const closeFence = codeFence[1];

      while (index < lines.length && lines[index].trim() !== closeFence) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({
        ...(codeFence[2] ? { language: codeFence[2] } : {}),
        text: codeLines.join("\n"),
        type: "code"
      });
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      flushParagraph();
      const tableLines = [line, lines[index + 1]];
      index += 2;

      while (index < lines.length && isMarkdownTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }

      index -= 1;
      blocks.push({
        language: "markdown",
        text: tableLines.join("\n"),
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
  const heading = /^(#{1,6})\s+(.+)$/.exec(line);

  if (heading) {
    return {
      children: parseMarkdownInlineText(heading[2]),
      type: getHeadingBlockType(heading[1].length)
    };
  }

  if (/^[-*_]\s*[-*_]\s*[-*_][\s-*_]*$/.test(line.trim())) {
    return { type: "divider" };
  }

  const image = /^!\[([^\]]*)]\(([^)\s]+)(?:\s+"[^"]*")?\)$/.exec(line.trim());

  if (image) {
    const src = getSafeMarkdownImageSrc(image[2]);

    if (src) {
      return {
        alt: image[1],
        src,
        type: "image"
      };
    }
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

  const bullet = /^(\s*)[-*+]\s+(.+)$/.exec(line);

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

  const callout = /^>!\s+(.+)$/.exec(line);

  if (callout) {
    return {
      children: parseMarkdownInlineText(callout[1]),
      icon: "💡",
      type: "callout"
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

function getHeadingBlockType(depth: number) {
  if (depth === 1) {
    return "heading_1";
  }

  if (depth === 2) {
    return "heading_2";
  }

  return "heading_3";
}

function isMarkdownTableStart(lines: string[], index: number) {
  return (
    isMarkdownTableRow(lines[index]) &&
    index + 1 < lines.length &&
    isMarkdownTableDivider(lines[index + 1])
  );
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();

  return trimmed.includes("|") && trimmed.split("|").length >= 3;
}

function isMarkdownTableDivider(line: string) {
  const cells = line
    .trim()
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  );
}

function getSafeMarkdownImageSrc(src: string) {
  const normalized = src.trim().slice(0, 2048);

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(normalized)
  ) {
    return normalized;
  }

  return "";
}
