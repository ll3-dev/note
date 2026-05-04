import { useEffect, useRef, type SyntheticEvent } from "react";
import type { Block, BlockProps, Page, PageDocument } from "@/shared/contracts";
import {
  getMergedBlockUpdate,
  type CreateBlockDraft
} from "@/mainview/features/page/lib/blockEditingBehavior";
import {
  getBlocksWithDescendants,
  getParentBlockOutdentTarget,
  getSubtreeSafeAfterBlockId
} from "@/mainview/features/page/lib/blockTree";
import type {
  BlockEditorUpdate,
  CreateBlockOptions,
  OpenPageLinkOptions
} from "@/mainview/features/page/types/blockEditorTypes";
import { focusPageTitleEditor } from "@/mainview/features/page/web/pageTitleDom";

type WorkspaceEditorActionsOptions = {
  clearPendingText: (blockId: string) => void;
  createBlockMutation: {
    isPending: boolean;
    mutateAsync: (input: {
      afterBlockId?: string | null;
      pageId: string;
      parentBlockId?: string | null;
      props?: BlockProps;
      text?: string;
      type?: Block["type"];
    }) => Promise<Block>;
  };
  createLinkedPage: (title: string, parentPageId: string) => Promise<Page>;
  createPageMutation: { mutate: (title: string) => void };
  deleteBlockMutation: {
    mutate: (block: Block) => void;
    mutateAsync: (block: Block) => Promise<unknown>;
  };
  flushAllTextDrafts: () => Promise<void>;
  flushQueuedTextDraft: (blockId: string) => Promise<void>;
  moveBlocks: (input: {
    afterBlockId: string | null;
    blocks: Block[];
    parentBlockId?: string | null;
  }) => Promise<void>;
  openPage: (page: Page, options?: OpenPageLinkOptions) => Promise<void>;
  openPageById: (pageId: string, options?: OpenPageLinkOptions) => Promise<void>;
  pageTitleDraft: string;
  selectedDocument: PageDocument | null;
  setFocusBlockId: (blockId: string, placement?: "start" | "end") => void;
  updateBlockMutation: {
    mutate: (input: { block: Block } & BlockEditorUpdate) => void;
    mutateAsync: (input: { block: Block } & BlockEditorUpdate) => Promise<Block>;
  };
  updatePageMutation: { mutate: (input: { page: Page; title: string }) => void };
};

export function useWorkspaceEditorActions({
  clearPendingText,
  createBlockMutation,
  createLinkedPage,
  createPageMutation,
  deleteBlockMutation,
  flushAllTextDrafts,
  flushQueuedTextDraft,
  moveBlocks,
  openPage,
  openPageById,
  pageTitleDraft,
  selectedDocument,
  setFocusBlockId,
  updateBlockMutation,
  updatePageMutation
}: WorkspaceEditorActionsOptions) {
  const ensuringEmptyPageBlockRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedDocument) {
      return;
    }

    if (selectedDocument.blocks.length > 0) {
      if (ensuringEmptyPageBlockRef.current === selectedDocument.page.id) {
        ensuringEmptyPageBlockRef.current = null;
      }
      return;
    }

    if (
      createBlockMutation.isPending ||
      ensuringEmptyPageBlockRef.current === selectedDocument.page.id
    ) {
      return;
    }

    ensuringEmptyPageBlockRef.current = selectedDocument.page.id;
    void createBlockMutation
      .mutateAsync({
        pageId: selectedDocument.page.id,
        props: {},
        text: "",
        type: "paragraph"
      })
      .then((block) => setFocusBlockId(block.id, "start"))
      .finally(() => {
        if (ensuringEmptyPageBlockRef.current === selectedDocument.page.id) {
          ensuringEmptyPageBlockRef.current = null;
        }
      });
  }, [createBlockMutation, selectedDocument, setFocusBlockId]);

  function handleCreatePage(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = pageTitleDraft.trim();
    if (title) {
      createPageMutation.mutate(title);
    }
  }

  async function createBlockAfter(
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) {
    await flushAllTextDrafts();
    const parentBlockId = options?.parentBlockId ?? block.parentBlockId;
    const created = await createBlockMutation.mutateAsync({
      afterBlockId: options?.afterBlockId === undefined ? block.id : options.afterBlockId,
      pageId: block.pageId,
      parentBlockId,
      props: draft?.props,
      text: draft?.text,
      type: draft?.type
    });
    setFocusBlockId(created.id, options?.focusPlacement ?? "end");
  }

  async function updateBlock(block: Block, changes: BlockEditorUpdate) {
    if (changes.text === undefined) {
      await flushQueuedTextDraft(block.id);
    }
    clearPendingText(block.id);
    updateBlockMutation.mutate({ block, ...changes });
  }

  async function createPageLink(block: Block) {
    const targetPage = await createLinkedPage("", block.pageId);

    await flushQueuedTextDraft(block.id);
    clearPendingText(block.id);
    await updateBlockMutation.mutateAsync({
      block,
      props: {
        targetPageId: targetPage.id,
        targetTitle: ""
      },
      text: "",
      type: "page_link"
    });
    await openPage(targetPage);
    focusPageTitleEditor();
  }

  function openPageLink(pageId: string, options?: OpenPageLinkOptions) {
    void openPageById(pageId, options);
  }

  async function mergeBlockWithPrevious(
    previousBlock: Block,
    block: Block,
    text: string,
    props: BlockProps
  ) {
    await flushQueuedTextDraft(previousBlock.id);
    clearPendingText(previousBlock.id);
    clearPendingText(block.id);
    await updateBlockMutation.mutateAsync({
      block: previousBlock,
      ...getMergedBlockUpdate(previousBlock, block, text, props)
    });
    await deleteBlockMutation.mutateAsync(block);
    setFocusBlockId(previousBlock.id, "end");
  }

  function updatePageTitle(page: Page, title: string) {
    const nextTitle = title.trim();
    if (nextTitle !== page.title) {
      updatePageMutation.mutate({ page, title: nextTitle });
    }
  }

  function focusFirstBlock() {
    const firstBlock = selectedDocument?.blocks[0];
    if (firstBlock) {
      setFocusBlockId(firstBlock.id, "start");
    }
  }

  function expandBlocksWithDescendants(blocks: Block[]) {
    return selectedDocument
      ? getBlocksWithDescendants(selectedDocument.blocks, blocks)
      : blocks;
  }

  async function moveBlocksWithDescendants(
    targets: Block[],
    afterBlockId: string | null,
    parentBlockId?: string | null
  ) {
    await flushAllTextDrafts();
    const movingBlocks = expandBlocksWithDescendants(targets);
    const safeAfterBlockId = getSubtreeSafeAfterBlockId(
      selectedDocument?.blocks ?? [],
      movingBlocks,
      afterBlockId
    );

    if (safeAfterBlockId === undefined) {
      return;
    }

    await moveBlocks({ afterBlockId: safeAfterBlockId, blocks: movingBlocks, parentBlockId });
  }

  async function moveBlockOutOfParent(block: Block) {
    if (!selectedDocument) {
      return;
    }

    const target = getParentBlockOutdentTarget(selectedDocument.blocks, block);

    if (!target) {
      return;
    }

    await moveBlocksWithDescendants(
      [block],
      target.afterBlockId,
      target.parentBlockId
    );
    setFocusBlockId(block.id, "start");
  }

  return {
    createBlockAfter,
    createPageLink,
    expandBlocksWithDescendants,
    focusFirstBlock,
    handleCreatePage,
    mergeBlockWithPrevious,
    moveBlockOutOfParent,
    moveBlocksWithDescendants,
    openPageLink,
    updateBlock,
    updatePageTitle
  };
}
