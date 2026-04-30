import type { BlockProps } from "@/shared/contracts";
import { normalizeLinkHref } from "@/shared/linkSanitization";
import { getInlineMarks } from "./inlineFormatting";

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\(([^)\s]+)\)/g;

export function parseMarkdownInlineLinks(
  text: string,
  props: BlockProps = {}
): { props: BlockProps; text: string } {
  const inlineMarks = [...getInlineMarks(props)];
  let nextText = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MARKDOWN_LINK_PATTERN.lastIndex = 0;

  while ((match = MARKDOWN_LINK_PATTERN.exec(text)) !== null) {
    const [, label, href] = match;
    const safeHref = normalizeLinkHref(href);

    nextText += text.slice(lastIndex, match.index);

    if (!safeHref) {
      nextText += label;
      lastIndex = match.index + match[0].length;
      continue;
    }

    const start = nextText.length;
    nextText += label;
    inlineMarks.push({
      end: nextText.length,
      href: safeHref,
      start,
      type: "link"
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex === 0) {
    return { props, text };
  }

  nextText += text.slice(lastIndex);

  return {
    props: inlineMarks.length > 0 ? { ...props, inlineMarks } : props,
    text: nextText
  };
}

export function serializeInlineLinks(text: string, props: BlockProps) {
  const links = getInlineMarks(props)
    .filter((mark) => mark.type === "link" && mark.href)
    .sort((left, right) => left.start - right.start);

  if (links.length === 0) {
    return text;
  }

  let nextText = "";
  let cursor = 0;

  for (const link of links) {
    if (link.start < cursor) {
      continue;
    }

    nextText += text.slice(cursor, link.start);
    nextText += `[${text.slice(link.start, link.end)}](${link.href})`;
    cursor = link.end;
  }

  return nextText + text.slice(cursor);
}
