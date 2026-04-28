import type {
  Block,
  BlockProps,
  BlockType,
  PageDocument
} from "../../../../shared/contracts";
import type { CreateBlockDraft } from "../../page/lib/blockEditingBehavior";
import {
  buildMarkdownPasteDrafts,
  serializePageToMarkdown
} from "../../page/lib/markdownBlocks";
import type { TextSelectionOffsets } from "../../page/types/blockEditorTypes";
import { writeTextToClipboard } from "../lib/clipboardText";

type CreateBlockInput = {
  afterBlockId?: string | null;
  pageId: string;
  props?: BlockProps;
  text?: string;
  type?: BlockType;
};

type UpdateBlockInput = {
  block: Block;
  props?: BlockProps;
  text?: string;
  type?: BlockType;
};

type UseMarkdownClipboardOptions = {
  clearPendingText: (blockId: string) => void;
  createBlock: (input: CreateBlockInput) => Promise<Block>;
  flushAllTextDrafts: () => Promise<void>;
  refetchDocument: () => Promise<PageDocument | null>;
  selectedDocument: PageDocument | null;
  setFocusBlockId: (blockId: string, placement?: "start" | "end") => void;
  updateBlock: (input: UpdateBlockInput) => Promise<Block>;
};

export function useMarkdownClipboard({
  clearPendingText,
  createBlock,
  flushAllTextDrafts,
  refetchDocument,
  selectedDocument,
  setFocusBlockId,
  updateBlock
}: UseMarkdownClipboardOptions) {
  async function pasteMarkdown(
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selectionOffsets: TextSelectionOffsets
  ) {
    const pasteDrafts = buildMarkdownPasteDrafts({
      currentBlock: {
        ...block,
        text: editableElement.textContent ?? block.text
      },
      markdown,
      selectionEnd: selectionOffsets.end,
      selectionStart: selectionOffsets.start
    });

    if (!pasteDrafts) {
      return;
    }

    await flushAllTextDrafts();
    clearPendingText(block.id);
    await updateBlock({ block, ...pasteDrafts.update });
    await createPasteBlocks(block, pasteDrafts.append, pasteDrafts.focusDraftIndex);
  }

  async function copyCurrentPageMarkdown() {
    await flushAllTextDrafts();
    const document = (await refetchDocument()) ?? selectedDocument;

    if (document) {
      await writeTextToClipboard(serializePageToMarkdown(document));
    }
  }

  async function createPasteBlocks(
    sourceBlock: Block,
    drafts: CreateBlockDraft[],
    focusDraftIndex: number
  ) {
    let afterBlockId = sourceBlock.id;
    const createdBlockIds: string[] = [];

    for (const draft of drafts) {
      const created = await createBlock({
        ...draft,
        afterBlockId,
        pageId: sourceBlock.pageId
      });

      afterBlockId = created.id;
      createdBlockIds.push(created.id);
    }

    const focusBlockId =
      focusDraftIndex === 0 ? sourceBlock.id : createdBlockIds[focusDraftIndex - 1];

    if (focusBlockId) {
      setFocusBlockId(focusBlockId, "end");
    }
  }

  return {
    copyCurrentPageMarkdown,
    pasteMarkdown
  };
}
