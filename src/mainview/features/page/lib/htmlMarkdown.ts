import { normalizeLinkHref } from "@/shared/linkSanitization";
import {
  importBlocksToMarkdown,
  plainInlineText,
  type ImportBlock,
  type ImportInline
} from "./importBlocks";

export type HtmlMarkdownNode =
  | {
      kind: "element";
      attributes?: Record<string, string>;
      children: HtmlMarkdownNode[];
      tagName: string;
    }
  | {
      kind: "text";
      text: string;
};

export function htmlNodesToMarkdown(nodes: HtmlMarkdownNode[]) {
  return importBlocksToMarkdown(htmlNodesToImportBlocks(nodes));
}

export function htmlNodesToImportBlocks(nodes: HtmlMarkdownNode[]) {
  return compactImportBlocks(nodes.flatMap((node) => htmlNodeToImportBlocks(node)));
}

function htmlNodeToImportBlocks(node: HtmlMarkdownNode): ImportBlock[] {
  if (node.kind === "text") {
    const text = normalizeInlineText(node.text);

    return text ? [{ children: plainInlineText(text), type: "paragraph" }] : [];
  }

  switch (node.tagName) {
    case "h1":
      return [{ children: getInlineNodesForBlock(node), type: "heading_1" }];
    case "h2":
    case "h3":
      return [{ children: getInlineNodesForBlock(node), type: "heading_2" }];
    case "blockquote":
      return getBlockInlines(node).map((children) => ({
        children,
        type: "quote"
      }));
    case "pre":
      return [
        {
          text: getInlineText(node, { preserveWhitespace: true }),
          type: "code"
        }
      ];
    case "ul":
      return htmlListToImportBlocks(node, false, 0);
    case "ol":
      return htmlListToImportBlocks(node, true, 0);
    case "p":
      return getParagraphBlocks(node);
    case "div":
    case "section":
    case "article":
      if (hasBlockChildren(node)) {
        return node.children.flatMap((child) => htmlNodeToImportBlocks(child));
      }
      return getParagraphBlocks(node);
    case "br":
      return [];
    default:
      if (hasBlockChildren(node)) {
        return node.children.flatMap((child) => htmlNodeToImportBlocks(child));
      }
      return getParagraphBlocks(node);
  }
}

function htmlListToImportBlocks(
  node: Extract<HtmlMarkdownNode, { kind: "element" }>,
  ordered: boolean,
  depth: number
): ImportBlock[] {
  let number = getStartNumber(node);
  const blocks: ImportBlock[] = [];

  for (const child of node.children) {
    if (child.kind !== "element" || child.tagName !== "li") {
      continue;
    }

    const nestedLists = child.children.filter(
      (item): item is Extract<HtmlMarkdownNode, { kind: "element" }> =>
        item.kind === "element" && (item.tagName === "ul" || item.tagName === "ol")
    );
    const inlineChildren = child.children.filter(
      (item) =>
        !(item.kind === "element" && (item.tagName === "ul" || item.tagName === "ol"))
    );
    const listItem = { ...child, children: inlineChildren };
    const checkbox = findCheckbox(child);
    const children = getInlineNodesForBlock(listItem);

    if (checkbox) {
      blocks.push({
        checked: checkbox.attributes?.checked !== undefined,
        children,
        depth,
        type: "todo"
      });
    } else if (ordered) {
      blocks.push({
        children,
        depth,
        start: number,
        type: "numbered_list"
      });
    } else {
      blocks.push({
        children,
        depth,
        type: "bulleted_list"
      });
    }

    for (const nestedList of nestedLists) {
      blocks.push(
        ...htmlListToImportBlocks(nestedList, nestedList.tagName === "ol", depth + 1)
      );
    }

    number += 1;
  }

  return blocks;
}

function findCheckbox(node: Extract<HtmlMarkdownNode, { kind: "element" }>) {
  return node.children.find(
    (child): child is Extract<HtmlMarkdownNode, { kind: "element" }> =>
      child.kind === "element" &&
      child.tagName === "input" &&
      child.attributes?.type === "checkbox"
  );
}

function getParagraphBlocks(
  node: Extract<HtmlMarkdownNode, { kind: "element" }>
): ImportBlock[] {
  return getBlockInlines(node).map((children) => ({
    children,
    type: "paragraph"
  }));
}

function getBlockInlines(
  node: Extract<HtmlMarkdownNode, { kind: "element" }>
): ImportInline[][] {
  const children = getInlineNodesForBlock(node);

  return children.length > 0 ? [children] : [];
}

function getInlineText(
  node: HtmlMarkdownNode,
  options: { preserveWhitespace?: boolean } = {}
): string {
  if (node.kind === "text") {
    return options.preserveWhitespace
      ? node.text
      : normalizeInlineWhitespace(node.text);
  }

  if (node.tagName === "br") {
    return "\n";
  }

  if (node.tagName === "input" && node.attributes?.type === "checkbox") {
    return "";
  }

  const text = node.children.map((child) => getInlineText(child, options)).join("");

  return options.preserveWhitespace ? text : normalizeInlineText(text);
}

function getInlineNodesForBlock(
  node: Extract<HtmlMarkdownNode, { kind: "element" }>
) {
  return trimInlineNodes(node.children.flatMap((child) => htmlNodeToInlineNodes(child)));
}

function htmlNodeToInlineNodes(node: HtmlMarkdownNode): ImportInline[] {
  if (node.kind === "text") {
    return plainInlineText(normalizeInlineWhitespace(node.text));
  }

  if (node.tagName === "br") {
    return plainInlineText("\n");
  }

  if (node.tagName === "input" && node.attributes?.type === "checkbox") {
    return [];
  }

  if (node.tagName === "strong" || node.tagName === "b") {
    return [{ children: getInlineChildren(node), type: "bold" }];
  }

  if (node.tagName === "em" || node.tagName === "i") {
    return [{ children: getInlineChildren(node), type: "italic" }];
  }

  if (node.tagName === "code") {
    return [{ text: getInlineText(node, { preserveWhitespace: true }), type: "code" }];
  }

  if (node.tagName === "a") {
    const href = normalizeLinkHref(node.attributes?.href ?? "");
    const children = getInlineChildren(node);

    return href && children.length > 0
      ? [{ children, href, type: "link" }]
      : children;
  }

  return getInlineChildren(node);
}

function getInlineChildren(node: Extract<HtmlMarkdownNode, { kind: "element" }>) {
  return trimInlineNodes(
    node.children.flatMap((child) => htmlNodeToInlineNodes(child))
  );
}

function getStartNumber(node: Extract<HtmlMarkdownNode, { kind: "element" }>) {
  const start = Number(node.attributes?.start);

  return Number.isInteger(start) && start > 0 ? start : 1;
}

function compactImportBlocks(blocks: ImportBlock[]) {
  return blocks.filter((block) => {
    if (block.type === "code" || block.type === "divider") {
      return true;
    }

    return block.children.length > 0;
  });
}

function trimInlineNodes(nodes: ImportInline[]) {
  const trimmed = [...nodes];

  trimInlineStart(trimmed);
  trimInlineEnd(trimmed);

  return mergeAdjacentText(trimmed).filter(
    (node) => node.type !== "text" || node.text.length > 0
  );
}

function trimInlineStart(nodes: ImportInline[]) {
  while (nodes[0]?.type === "text") {
    const text = nodes[0].text.replace(/^\s+/, "");

    if (text.length > 0) {
      nodes[0] = { text, type: "text" };
      return;
    }

    nodes.shift();
  }
}

function trimInlineEnd(nodes: ImportInline[]) {
  while (nodes[nodes.length - 1]?.type === "text") {
    const index = nodes.length - 1;
    const last = nodes[index];

    if (last.type !== "text") {
      return;
    }

    const text = last.text.replace(/\s+$/, "");

    if (text.length > 0) {
      nodes[index] = { text, type: "text" };
      return;
    }

    nodes.pop();
  }
}

function mergeAdjacentText(nodes: ImportInline[]) {
  const merged: ImportInline[] = [];

  for (const node of nodes) {
    const previous = merged[merged.length - 1];

    if (previous?.type === "text" && node.type === "text") {
      previous.text += node.text;
      continue;
    }

    merged.push(node);
  }

  return merged;
}

function normalizeInlineText(text: string) {
  return normalizeInlineWhitespace(text).trim();
}

function normalizeInlineWhitespace(text: string) {
  return text.replace(/\s+/g, " ");
}

function hasBlockChildren(node: Extract<HtmlMarkdownNode, { kind: "element" }>) {
  return node.children.some(
    (child) =>
      child.kind === "element" &&
      [
        "blockquote",
        "div",
        "h1",
        "h2",
        "h3",
        "ol",
        "p",
        "pre",
        "ul"
      ].includes(child.tagName)
  );
}
