import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Text
} from "lucide-react";
import type { BlockProps, BlockType } from "../../../../shared/contracts";

export type BlockCommand = {
  description: string;
  label: string;
  type: BlockType;
  icon: typeof Text;
  props?: BlockProps;
};

export const BLOCK_COMMANDS: BlockCommand[] = [
  {
    description: "Plain text block",
    icon: Text,
    label: "Text",
    type: "paragraph"
  },
  {
    description: "Large section heading",
    icon: Heading1,
    label: "Heading 1",
    type: "heading_1"
  },
  {
    description: "Medium section heading",
    icon: Heading2,
    label: "Heading 2",
    type: "heading_2"
  },
  {
    description: "Checkbox task",
    icon: CheckSquare,
    label: "To-do",
    props: { checked: false },
    type: "todo"
  },
  {
    description: "Bulleted list item",
    icon: List,
    label: "Bulleted list",
    type: "bulleted_list"
  },
  {
    description: "Numbered list item",
    icon: ListOrdered,
    label: "Numbered list",
    type: "numbered_list"
  },
  {
    description: "Quoted callout text",
    icon: Quote,
    label: "Quote",
    type: "quote"
  },
  {
    description: "Monospace code block",
    icon: Code2,
    label: "Code",
    type: "code"
  },
  {
    description: "Horizontal divider",
    icon: Minus,
    label: "Divider",
    type: "divider"
  }
];

export function getMarkdownShortcut(value: string):
  | { props: BlockProps; text: string; type: BlockType }
  | null {
  const shortcuts: Array<[RegExp, BlockType, BlockProps?]> = [
    [/^#\s$/, "heading_1"],
    [/^##\s$/, "heading_2"],
    [/^-\s$/, "bulleted_list"],
    [/^1\.\s$/, "numbered_list"],
    [/^>\s$/, "quote"],
    [/^```\s?$/, "code"],
    [/^\[\]\s$|^\[ \]\s$/, "todo", { checked: false }],
    [/^---$/, "divider"]
  ];

  for (const [pattern, type, props] of shortcuts) {
    if (pattern.test(value)) {
      return {
        props: props ?? {},
        text: "",
        type
      };
    }
  }

  return null;
}
