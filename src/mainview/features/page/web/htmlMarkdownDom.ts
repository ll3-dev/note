import {
  htmlNodesToMarkdown,
  type HtmlMarkdownNode
} from "@/mainview/features/page/lib/htmlMarkdown";

export function htmlToMarkdown(html: string) {
  const parser = typeof DOMParser === "undefined" ? null : new DOMParser();

  if (!parser) {
    return "";
  }

  const document = parser.parseFromString(html, "text/html");

  return htmlNodesToMarkdown(
    Array.from(document.body.childNodes).map(toHtmlMarkdownNode)
  );
}

function toHtmlMarkdownNode(node: ChildNode): HtmlMarkdownNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return {
      kind: "text",
      text: node.textContent ?? ""
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return { kind: "text", text: "" };
  }

  const element = node as Element;

  return {
    attributes: Object.fromEntries(
      Array.from(element.attributes).map((attribute) => [
        attribute.name,
        attribute.value
      ])
    ),
    children: Array.from(element.childNodes).map(toHtmlMarkdownNode),
    kind: "element",
    tagName: element.tagName.toLowerCase()
  };
}
