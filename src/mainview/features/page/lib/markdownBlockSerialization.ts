import type { Block, BlockProps, PageDocument } from "@/shared/contracts";
import { serializeInlineLinks } from "./markdownInlineLinks";

const MAX_MARKDOWN_DEPTH = 6;

export function serializePageToMarkdown(document: PageDocument) {
  const lines: string[] = [];

  document.blocks.forEach((block, index) => {
    if (lines.length > 0 && shouldSeparateBlocks(document.blocks[index - 1])) {
      lines.push("");
    }

    lines.push(...serializeBlock(block));
  });

  return lines.join("\n");
}

function serializeBlock(block: Block) {
  const text = serializeInlineLinks(block.text, block.props);
  const depthPrefix = "  ".repeat(getDepth(block.props));

  switch (block.type) {
    case "heading_1":
      return [`# ${text}`];
    case "heading_2":
      return [`## ${text}`];
    case "heading_3":
      return [`### ${text}`];
    case "bulleted_list":
      return [`${depthPrefix}- ${text}`];
    case "numbered_list":
      return [`${depthPrefix}${getNumberStart(block.props)}. ${text}`];
    case "todo":
      return [`${depthPrefix}- [${block.props.checked ? "x" : " "}] ${text}`];
    case "quote":
      return [`> ${text}`];
    case "callout":
      return [`>! ${text}`];
    case "toggle":
      return [`> ${block.props.open === false ? "" : "> "}${text}`];
    case "code":
      return [`\`\`\`${getLanguage(block.props)}`, text, "```"];
    case "divider":
      return ["---"];
    case "image":
      return [`![${getImageAlt(block.props)}](${getImageSrc(block.props)})`];
    case "page_link":
    case "paragraph":
      return [text];
  }
}

function shouldSeparateBlocks(block: Block) {
  return (
    block.type === "heading_1" ||
    block.type === "heading_2" ||
    block.type === "heading_3" ||
    block.type === "paragraph"
  );
}

function getDepth(props: BlockProps) {
  return typeof props.depth === "number" && Number.isInteger(props.depth)
    ? Math.max(0, Math.min(MAX_MARKDOWN_DEPTH, props.depth))
    : 0;
}

function getNumberStart(props: BlockProps) {
  return typeof props.start === "number" &&
    Number.isInteger(props.start) &&
    props.start > 0
    ? props.start
    : 1;
}

function getLanguage(props: BlockProps) {
  return typeof props.language === "string" ? props.language : "";
}

function getImageSrc(props: BlockProps) {
  return typeof props.src === "string" ? props.src : "";
}

function getImageAlt(props: BlockProps) {
  return typeof props.alt === "string" ? props.alt : "";
}
