import type { Block } from "../../../../shared/contracts";
import type { CreateBlockDraft } from "./blockEditingBehavior";
import { parseMarkdownToBlockDrafts } from "./markdownBlockParsing";

type MarkdownPasteInput = {
  currentBlock: Block;
  markdown: string;
  selectionEnd: number;
  selectionStart: number;
};

export type MarkdownPasteDrafts = {
  append: CreateBlockDraft[];
  focusDraftIndex: number;
  update: Required<CreateBlockDraft>;
};

export function buildMarkdownPasteDrafts({
  currentBlock,
  markdown,
  selectionEnd,
  selectionStart
}: MarkdownPasteInput): MarkdownPasteDrafts | null {
  const markdownDrafts = parseMarkdownToBlockDrafts(markdown);

  if (markdownDrafts.length === 0) {
    return null;
  }

  const text = currentBlock.text;
  const start = clampSelectionOffset(selectionStart, text);
  const end = clampSelectionOffset(selectionEnd, text);
  const beforeText = text.slice(0, Math.min(start, end));
  const afterText = text.slice(Math.max(start, end));
  const [firstDraft, ...restDrafts] = markdownDrafts;
  const append = [...restDrafts];

  if (afterText) {
    append.push({
      props: {},
      text: afterText,
      type: "paragraph"
    });
  }

  return {
    append,
    focusDraftIndex: append.length,
    update: {
      props: firstDraft.props,
      text: `${beforeText}${firstDraft.text}`,
      type: firstDraft.type
    }
  };
}

function clampSelectionOffset(offset: number, text: string) {
  return Math.max(0, Math.min(offset, text.length));
}
