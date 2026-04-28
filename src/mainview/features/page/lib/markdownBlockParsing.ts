import type { BlockProps } from "../../../../shared/contracts";
import type { CreateBlockDraft } from "./blockEditingBehavior";

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
  const drafts: Array<Required<CreateBlockDraft>> = [];
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

      drafts.push({
        props: codeFence[1] ? { language: codeFence[1] } : {},
        text: codeLines.join("\n"),
        type: "code"
      });
      continue;
    }

    const blockDraft = parseMarkdownLine(line);

    if (blockDraft) {
      flushParagraph();
      drafts.push(blockDraft);
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();

  return drafts;

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    drafts.push({
      props: {},
      text: paragraphLines.join("\n"),
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

function parseMarkdownLine(line: string): Required<CreateBlockDraft> | null {
  const heading = /^(#{1,2})\s+(.+)$/.exec(line);

  if (heading) {
    return {
      props: {},
      text: heading[2],
      type: heading[1].length === 1 ? "heading_1" : "heading_2"
    };
  }

  if (/^---$/.test(line.trim())) {
    return { props: {}, text: "", type: "divider" };
  }

  const todo = /^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);

  if (todo) {
    return {
      props: {
        ...depthProps(todo[1]),
        checked: todo[2].toLowerCase() === "x"
      },
      text: todo[3],
      type: "todo"
    };
  }

  const bullet = /^(\s*)[-*]\s+(.+)$/.exec(line);

  if (bullet) {
    return {
      props: depthProps(bullet[1]),
      text: bullet[2],
      type: "bulleted_list"
    };
  }

  const numbered = /^(\s*)(\d+)\.\s+(.+)$/.exec(line);

  if (numbered) {
    return {
      props: {
        ...depthProps(numbered[1]),
        start: Number(numbered[2])
      },
      text: numbered[3],
      type: "numbered_list"
    };
  }

  const quote = /^>\s+(.+)$/.exec(line);

  return quote ? { props: {}, text: quote[1], type: "quote" } : null;
}

function depthProps(indentation: string): BlockProps {
  const depth = Math.min(
    MAX_MARKDOWN_DEPTH,
    Math.floor(indentation.replace(/\t/g, "  ").length / 2)
  );

  return depth > 0 ? { depth } : {};
}
