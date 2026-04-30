import type { Block, PageDocument } from "@/shared/contracts";
import { writeTextToClipboard } from "@/mainview/features/workspace/lib/clipboardText";
import {
  parseMarkdownToBlockDrafts,
  serializePageToMarkdown
} from "@/mainview/features/page/lib/markdownBlocks";
import type { CreateBlockDraft } from "./blockEditingBehavior";

type ClipboardBlockDraft = Required<
  Pick<CreateBlockDraft, "props" | "text" | "type">
>;

type InternalBlockClipboard = {
  blocks: ClipboardBlockDraft[];
  markdown: string;
};

export type BlockClipboardPaste =
  | {
      drafts: CreateBlockDraft[];
      kind: "blocks";
    }
  | {
      drafts: CreateBlockDraft[];
      kind: "markdown";
    };

let internalBlockClipboard: InternalBlockClipboard | null = null;

export async function copyBlocksToClipboard(
  document: PageDocument,
  blocks: Block[]
) {
  const markdown = serializePageToMarkdown({ ...document, blocks });

  internalBlockClipboard = {
    blocks: blocks.map((block) => ({
      props: structuredCloneBlockProps(block.props),
      text: block.text,
      type: block.type
    })),
    markdown
  };

  await writeTextToClipboard(markdown);
}

export async function readBlockClipboardPaste(): Promise<BlockClipboardPaste | null> {
  const clipboardText = await readClipboardText();

  if (
    internalBlockClipboard &&
    (clipboardText === internalBlockClipboard.markdown || clipboardText === null)
  ) {
    return {
      drafts: internalBlockClipboard.blocks.map((block) => ({
        props: structuredCloneBlockProps(block.props),
        text: block.text,
        type: block.type
      })),
      kind: "blocks"
    };
  }

  if (!clipboardText?.trim()) {
    return null;
  }

  return {
    drafts: parseMarkdownToBlockDrafts(clipboardText),
    kind: "markdown"
  };
}

function structuredCloneBlockProps(props: Block["props"]) {
  return structuredClone(props) as Block["props"];
}

async function readClipboardText() {
  const readText = navigator.clipboard?.readText;

  if (!readText) {
    return null;
  }

  try {
    return await readText.call(navigator.clipboard);
  } catch {
    return null;
  }
}
