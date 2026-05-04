import { useEffect } from "react";
import type { Block, BlockProps, Page, PageDocument } from "@/shared/contracts";
import type { WorkspacePageEditorManager } from "@/mainview/features/workspace/components/WorkspaceEditorPane";
import { useBlockBatchActions } from "./useBlockBatchActions";
import type { TextSyncStatus } from "./useBlockTextSync";
import { useMarkdownClipboard } from "./useMarkdownClipboard";
import { usePageHistoryActions } from "./usePageHistoryActions";
import { useWorkspaceEditorActions } from "./useWorkspaceEditorActions";
import type { useWorkspaceMutations } from "./useWorkspaceMutations";
import type { OpenPageLinkOptions } from "@/mainview/features/page/types/blockEditorTypes";

type WorkspaceMutations = ReturnType<typeof useWorkspaceMutations>;

type WorkspacePageEditorControllerOptions = {
  createBlockMutation: WorkspaceMutations["createBlockMutation"];
  createBlocks: WorkspaceMutations["createBlocks"];
  createLinkedPage: WorkspaceMutations["createLinkedPage"];
  createPageMutation: WorkspaceMutations["createPageMutation"];
  deleteBlockMutation: WorkspaceMutations["deleteBlockMutation"];
  deleteBlocksBatch: WorkspaceMutations["deleteBlocks"];
  clearPendingText: (blockId: string) => void;
  flushAllTextDrafts: () => Promise<void>;
  flushDocument: () => void;
  flushQueuedTextDraft: (blockId: string) => Promise<void>;
  flushTextDraft: (block: Block, text: string, props?: BlockProps) => Promise<void>;
  focusNextBlock: (block: Block) => boolean;
  focusPreviousBlock: (block: Block) => boolean;
  moveBlocks: WorkspaceMutations["moveBlocks"];
  openPage: (page: Page, options?: OpenPageLinkOptions) => Promise<void>;
  openPageById: (pageId: string, options?: OpenPageLinkOptions) => Promise<void>;
  onRestorePageLink: (pageId: string) => void;
  pageTitleDraft: string;
  queueTextDraft: (block: Block, text: string, props?: BlockProps) => void;
  refetchDocument: () => Promise<PageDocument | null>;
  saveStatus: TextSyncStatus;
  selectedDocument: PageDocument | null;
  setFocusBlockId: (blockId: string, placement?: "start" | "end") => void;
  updateBlockMutation: WorkspaceMutations["updateBlockMutation"];
  updatePageMutation: WorkspaceMutations["updatePageMutation"];
};

export function useWorkspacePageEditorController({
  createBlockMutation,
  createBlocks,
  createLinkedPage,
  createPageMutation,
  deleteBlockMutation,
  deleteBlocksBatch,
  clearPendingText,
  flushAllTextDrafts,
  flushDocument,
  flushQueuedTextDraft,
  flushTextDraft,
  focusNextBlock,
  focusPreviousBlock,
  moveBlocks,
  openPage,
  openPageById,
  onRestorePageLink,
  pageTitleDraft,
  queueTextDraft,
  refetchDocument,
  saveStatus,
  selectedDocument,
  setFocusBlockId,
  updateBlockMutation,
  updatePageMutation
}: WorkspacePageEditorControllerOptions) {
  const { copyCurrentPageMarkdown, pasteMarkdown } = useMarkdownClipboard({
    clearPendingText,
    createBlock: createBlockMutation.mutateAsync,
    flushAllTextDrafts,
    refetchDocument,
    selectedDocument,
    setFocusBlockId,
    updateBlock: updateBlockMutation.mutateAsync
  });
  const { deleteBlocks, duplicateBlocks, pasteBlocksAfter } = useBlockBatchActions({
    clearPendingText,
    createBlocks,
    deleteBlocksBatch,
    flushAllTextDrafts,
    getBlocks: () => selectedDocument?.blocks ?? [],
    getBlocksCount: () => selectedDocument?.blocks.length ?? 0,
    setFocusBlockId
  });
  const { redoBlockText, redoPage, undoBlockText, undoPage } = usePageHistoryActions({
    clearPendingText,
    refetchDocument: flushDocument
  });

  useEffect(() => {
    function handleMenuHistoryCommand(event: Event) {
      if (isEditableElement(document.activeElement) || !selectedDocument) {
        return;
      }

      const command = (event as CustomEvent<"redo" | "undo">).detail;

      if (command === "undo") {
        void undoPage(selectedDocument.page.id);
      } else if (command === "redo") {
        void redoPage(selectedDocument.page.id);
      }
    }

    window.addEventListener("note-history-command", handleMenuHistoryCommand);

    return () => {
      window.removeEventListener("note-history-command", handleMenuHistoryCommand);
    };
  }, [redoPage, selectedDocument, undoPage]);

  const editorActions = useWorkspaceEditorActions({
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
  });

  const pageEditorManager = {
    blockActions: {
      createAfter: editorActions.createBlockAfter,
      createPageLink: editorActions.createPageLink,
      deleteOne: (target) => {
        void flushAllTextDrafts().then(() => deleteBlockMutation.mutate(target));
      },
      focusNext: focusNextBlock,
      focusPrevious: focusPreviousBlock,
      mergeWithPrevious: editorActions.mergeBlockWithPrevious,
      moveOutOfParent: editorActions.moveBlockOutOfParent,
      openPageLink: editorActions.openPageLink,
      restorePageLink: onRestorePageLink,
      update: editorActions.updateBlock
    },
    blockCollectionActions: {
      deleteMany: (targets) =>
        void deleteBlocks(editorActions.expandBlocksWithDescendants(targets)),
      duplicateMany: (targets) =>
        void duplicateBlocks(editorActions.expandBlocksWithDescendants(targets)),
      indentMany: (updates) => {
        for (const { block, props } of updates) {
          void editorActions.updateBlock(block, { props });
        }
      },
      moveMany: editorActions.moveBlocksWithDescendants,
      pasteAfter: (target) => pasteBlocksAfter(target)
    },
    textActions: {
      changeDraft: queueTextDraft,
      flushDraft: flushTextDraft,
      pasteMarkdown,
      applyHistory: (block) => clearPendingText(block.id),
      redo: redoBlockText,
      undo: undoBlockText
    },
    titleActions: {
      focusFirstBlock: editorActions.focusFirstBlock,
      updateTitle: editorActions.updatePageTitle
    }
  } satisfies WorkspacePageEditorManager;

  return {
    copyCurrentPageMarkdown,
    editorActions,
    pageEditorManager,
    flushAllTextDrafts,
    saveStatus,
    setFocusBlockId
  };
}

function isEditableElement(element: Element | null) {
  return Boolean(element?.closest("input,textarea,select,[contenteditable]"));
}
