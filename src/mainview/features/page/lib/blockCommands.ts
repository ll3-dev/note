import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Link,
  List,
  ListOrdered,
  Minus,
  ListTree,
  Quote,
  Text
} from "lucide-react";
import type { BlockProps, BlockType } from "@/shared/contracts";
import type { CreateBlockDraft } from "./blockEditingBehavior";

export type BlockCommand = {
  action?: "delete" | "insertAfter" | "turnInto";
  aliases: string[];
  createBlockAfter?: CreateBlockDraft;
  description: string;
  icon: typeof Text;
  id: string;
  label: string;
  props?: BlockProps;
  type: BlockType;
};

export const BLOCK_COMMANDS: BlockCommand[] = [
  {
    action: "turnInto",
    aliases: ["plain"],
    description: "Plain text block",
    icon: Text,
    id: "turn-into-paragraph",
    label: "Text",
    type: "paragraph"
  },
  {
    action: "turnInto",
    aliases: ["h1", "#"],
    description: "Large section heading",
    icon: Heading1,
    id: "turn-into-heading-1",
    label: "Heading 1",
    type: "heading_1"
  },
  {
    action: "turnInto",
    aliases: ["h2", "##"],
    description: "Medium section heading",
    icon: Heading2,
    id: "turn-into-heading-2",
    label: "Heading 2",
    type: "heading_2"
  },
  {
    action: "turnInto",
    aliases: ["h3", "###"],
    description: "Small section heading",
    icon: Heading3,
    id: "turn-into-heading-3",
    label: "Heading 3",
    type: "heading_3"
  },
  {
    action: "turnInto",
    aliases: ["check", "checkbox", "task"],
    description: "Checkbox task",
    icon: CheckSquare,
    id: "turn-into-todo",
    label: "To-do",
    props: { checked: false },
    type: "todo"
  },
  {
    action: "turnInto",
    aliases: ["bullet", "ul", "list"],
    description: "Bulleted list item",
    icon: List,
    id: "turn-into-bulleted-list",
    label: "Bulleted list",
    type: "bulleted_list"
  },
  {
    action: "turnInto",
    aliases: ["number", "num", "ol", "list"],
    description: "Numbered list item",
    icon: ListOrdered,
    id: "turn-into-numbered-list",
    label: "Numbered list",
    type: "numbered_list"
  },
  {
    action: "turnInto",
    aliases: ["blockquote"],
    description: "Quoted callout text",
    icon: Quote,
    id: "turn-into-quote",
    label: "Quote",
    type: "quote"
  },
  {
    action: "turnInto",
    aliases: ["toggle", "disclosure"],
    description: "Collapsible block with nested content",
    icon: ListTree,
    id: "turn-into-toggle",
    label: "Toggle list",
    props: { open: true },
    type: "toggle"
  },
  {
    action: "turnInto",
    aliases: ["pre", "fence"],
    description: "Monospace code block",
    icon: Code2,
    id: "turn-into-code",
    label: "Code",
    type: "code"
  },
  {
    action: "turnInto",
    aliases: ["image", "img", "media"],
    description: "Image with caption",
    icon: Image,
    id: "turn-into-image",
    label: "Image",
    props: {},
    type: "image"
  },
  {
    action: "turnInto",
    aliases: ["div", "line", "hr"],
    createBlockAfter: { props: {}, text: "", type: "paragraph" },
    description: "Horizontal divider",
    icon: Minus,
    id: "turn-into-divider",
    label: "Divider",
    type: "divider"
  },
  {
    aliases: ["page", "mention"],
    description: "Link to another page by title",
    icon: Link,
    id: "turn-into-page-link",
    label: "Page link",
    type: "page_link"
  },
  {
    action: "insertAfter",
    aliases: ["insert", "below", "new"],
    description: "Insert a text block below",
    icon: Text,
    id: "insert-paragraph-below",
    label: "Text below",
    type: "paragraph"
  },
  {
    action: "insertAfter",
    aliases: ["insert", "below", "todo", "task"],
    description: "Insert a to-do block below",
    icon: CheckSquare,
    id: "insert-todo-below",
    label: "To-do below",
    props: { checked: false },
    type: "todo"
  },
  {
    action: "delete",
    aliases: ["remove", "trash"],
    description: "Delete this block",
    icon: Minus,
    id: "delete-current-block",
    label: "Delete block",
    type: "paragraph"
  }
];

export function filterBlockCommands(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return BLOCK_COMMANDS;
  }

  return BLOCK_COMMANDS.filter((command) =>
    [command.label, command.description, ...command.aliases].some((value) =>
      value.toLowerCase().includes(normalizedQuery)
    )
  );
}

export type MarkdownShortcut = {
  createBlockAfter?: CreateBlockDraft;
  props: BlockProps;
  text: string;
  type: BlockType;
};

export function getMarkdownShortcut(value: string): MarkdownShortcut | null {
  const numberedListMatch = /^(\d+)\.\s$/.exec(value);

  if (numberedListMatch) {
    return {
      props: { start: Number(numberedListMatch[1]) },
      text: "",
      type: "numbered_list"
    };
  }

  const shortcuts: Array<[RegExp, MarkdownShortcut]> = [
    [/^#\s$/, { props: {}, text: "", type: "heading_1" }],
    [/^##\s$/, { props: {}, text: "", type: "heading_2" }],
    [/^[-+]\s$/, { props: {}, text: "", type: "bulleted_list" }],
    [/^>\s$/, { props: {}, text: "", type: "quote" }],
    [/^"\s$/, { props: {}, text: "", type: "quote" }],
    [/^>\s>\s$/, { props: { open: true }, text: "", type: "toggle" }],
    [/^```\s?$/, { props: {}, text: "", type: "code" }],
    [/^###\s$/, { props: {}, text: "", type: "heading_3" }],
    [/^\[\]\s$|^\[ \]\s$/, { props: { checked: false }, text: "", type: "todo" }],
    [
      /^---$/,
      {
        createBlockAfter: { props: {}, text: "", type: "paragraph" },
        props: {},
        text: "",
        type: "divider"
      }
    ]
  ];

  for (const [pattern, shortcut] of shortcuts) {
    if (pattern.test(value)) {
      return shortcut;
    }
  }

  return null;
}
