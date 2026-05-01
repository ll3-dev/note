import { useCallback, useEffect, useMemo } from "react";
import { useGlobalKeyboardShortcuts } from "@/mainview/features/commands/useGlobalKeyboardShortcuts";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Block, BlockProps } from "@/shared/contracts";
import { useBlockFocus } from "@/mainview/features/page/hooks/useBlockFocus";
import { useBlockKeyboardFocus } from "@/mainview/features/page/hooks/useBlockKeyboardFocus";
import { WorkspaceEditorPane } from "./components/WorkspaceEditorPane";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { QuickSwitcherDialog } from "./components/QuickSwitcherDialog";
import { useBlockBatchActions } from "./hooks/useBlockBatchActions";
import { useBlockTextSync } from "./hooks/useBlockTextSync";
import { useInitialPageSelection } from "./hooks/useInitialPageSelection";
import { useMarkdownClipboard } from "./hooks/useMarkdownClipboard";
import { usePageHistoryActions } from "./hooks/usePageHistoryActions";
import { useQuickSwitcher } from "./hooks/useQuickSwitcher";
import { useWorkspaceEditorActions } from "./hooks/useWorkspaceEditorActions";
import { useWorkspaceMutations } from "./hooks/useWorkspaceMutations";
import { navigateToPage, useWorkspaceNavigation } from "./hooks/useWorkspaceNavigation";
import { useWorkspaceQueries } from "./hooks/useWorkspaceQueries";
import { WORKSPACE_COMMANDS } from "./lib/workspaceCommands";

type WorkspaceScreenProps = {
  routePageId: string | null;
};

export function WorkspaceScreen({ routePageId }: WorkspaceScreenProps) {
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const openPageTab = useWorkspaceStore((state) => state.openPageTab);
  const pageTitleDraft = useWorkspaceStore((state) => state.pageTitleDraft);
  const renamePageRefs = useWorkspaceStore((state) => state.renamePageRefs);
  const selectedPageId = useWorkspaceStore((state) => state.selectedPageId);
  const setActiveTabId = useWorkspaceStore((state) => state.setActiveTabId);
  const setPageTitleDraft = useWorkspaceStore((state) => state.setPageTitleDraft);
  const setSelectedPageId = useWorkspaceStore((state) => state.setSelectedPageId);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const keybindings = useKeybindingStore((state) => state.keybindings);
  const activePageId = routePageId ?? selectedPageId;
  const { backlinksQuery, databaseStatusQuery, pageDocumentQuery, pagesQuery, refreshWorkspace } = useWorkspaceQueries(activePageId);

  const { createBlockMutation, createBlocks, deleteBlocks: deleteBlocksBatch, createLinkedPage, createPageMutation, deleteBlockMutation, moveBlocks, movePageMutation, updatePageMutation, updateBlockMutation } = useWorkspaceMutations({
    navigateToPage: async (pageId) => {
      await navigateToPage(navigate, pageId);
    },
    onPageCreated: (page) => {
      openPageTab(page);
      setPageTitleDraft("");
    },
    onPageUpdated: (page) => {
      renamePageRefs(page);
    }
  });

  const pages = pagesQuery.data ?? [];
  const selectedDocument = pageDocumentQuery.data ?? null;
  const { setFocusBlockId } = useBlockFocus(selectedDocument);
  const { focusNextBlock, focusPreviousBlock } = useBlockKeyboardFocus(selectedDocument, setFocusBlockId);
  const saveBlockText = useCallback(
    async (block: Block, text: string, props?: BlockProps) => {
      await updateBlockMutation.mutateAsync({ block, props, text });
    },
    [updateBlockMutation]
  );
  const { clearPendingText, flushAllTextDrafts, flushQueuedTextDraft, flushTextDraft, queueTextDraft, status: saveStatus } =
    useBlockTextSync({ saveText: saveBlockText });
  const { closeActiveTab, closeWorkspaceTab, navigate, selectPage, selectTab } =
    useWorkspaceNavigation({ activeTabId, closeTab, flushBeforeNavigate: flushAllTextDrafts, openPageTab, setActiveTabId, tabs });
  const quickSwitcher = useQuickSwitcher({
    onSelectResult: (result) => {
      void flushAllTextDrafts().then(() => {
        void navigateToPage(navigate, result.pageId);
        if (result.kind === "block") {
          setFocusBlockId(result.blockId, "start");
        }
      });
    }
  });
  const workspaceCommandContext = useMemo(
    () => ({
      closeActiveTab,
      openQuickSwitcher: quickSwitcher.openQuickSwitcher,
      toggleSidebar
    }),
    [closeActiveTab, quickSwitcher.openQuickSwitcher, toggleSidebar]
  );
  const { copyCurrentPageMarkdown, pasteMarkdown } = useMarkdownClipboard({
    clearPendingText,
    createBlock: createBlockMutation.mutateAsync,
    flushAllTextDrafts,
    refetchDocument: async () => (await pageDocumentQuery.refetch()).data ?? null,
    selectedDocument,
    setFocusBlockId,
    updateBlock: updateBlockMutation.mutateAsync
  });
  const { deleteBlocks, duplicateBlocks, pasteBlocksAfter } = useBlockBatchActions({
    clearPendingText,
    createBlocks,
    deleteBlocksBatch,
    flushAllTextDrafts,
    getBlocksCount: () => selectedDocument?.blocks.length ?? 0,
    setFocusBlockId
  });
  const { redoBlockText, redoPage, undoBlockText, undoPage } = usePageHistoryActions({
    clearPendingText,
    refetchDocument: () => {
      void pageDocumentQuery.refetch();
    }
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
    navigate,
    pageTitleDraft,
    selectedDocument,
    setFocusBlockId,
    updateBlockMutation,
    updatePageMutation
  });

  useGlobalKeyboardShortcuts({
    activeScopes: ["global", "workspace"],
    commands: WORKSPACE_COMMANDS,
    context: workspaceCommandContext,
    keybindings
  });
  useInitialPageSelection({ activePageId, navigate, openPageTab, pages, routePageId, setSelectedPageId });

  return (
    <WorkspaceLayout
      activePageId={activePageId}
      blocksCount={databaseStatusQuery.data?.blocksCount ?? 0}
      isCreatingPage={createPageMutation.isPending}
      onCloseTab={closeWorkspaceTab}
      onCopyCurrentPageMarkdown={() => void copyCurrentPageMarkdown()}
      onCreatePage={editorActions.handleCreatePage}
      onCreateUntitledPage={() => createPageMutation.mutate("Untitled")}
      onMovePage={(page, parentPageId, afterPageId) => {
        movePageMutation.mutate({ afterPageId, page, parentPageId });
      }}
      onRefreshWorkspace={() => {
        void flushAllTextDrafts().then(refreshWorkspace);
      }}
      onSelectPage={selectPage}
      onSelectTab={selectTab}
      pages={pages}
      pagesCount={databaseStatusQuery.data?.pagesCount ?? 0}
      saveStatus={saveStatus}
      sqliteVersion={databaseStatusQuery.data?.sqliteVersion}
    >
      <WorkspaceEditorPane
        backlinks={backlinksQuery.data ?? []}
        document={selectedDocument}
        isLoading={pagesQuery.isLoading}
        onCreateBlockAfter={editorActions.createBlockAfter}
        onCreatePageLink={editorActions.createPageLink}
        onDeleteBlock={(target) => {
          void flushAllTextDrafts().then(() => deleteBlockMutation.mutate(target));
        }}
        onDeleteBlocks={(targets) =>
          void deleteBlocks(editorActions.expandBlocksWithDescendants(targets))
        }
        onDuplicateBlocks={(targets) =>
          void duplicateBlocks(editorActions.expandBlocksWithDescendants(targets))
        }
        onPasteBlocks={(target) => pasteBlocksAfter(target)}
        onFocusFirstBlock={editorActions.focusFirstBlock}
        onFocusNextBlock={focusNextBlock}
        onFocusPreviousBlock={focusPreviousBlock}
        onIndentBlocks={(updates) => {
          for (const { block, props } of updates) {
            void editorActions.updateBlock(block, { props });
          }
        }}
        onMergeBlockWithPrevious={editorActions.mergeBlockWithPrevious}
        onMoveBlocks={editorActions.moveBlocksWithDescendants}
        onPasteMarkdown={pasteMarkdown}
        onOpenPageLink={editorActions.openPageLink}
        onTextDraftChange={queueTextDraft}
        onTextDraftFlush={flushTextDraft}
        onTextHistoryApply={(block) => clearPendingText(block.id)}
        onTextRedo={redoBlockText}
        onTextUndo={undoBlockText}
        onUpdateBlock={(target, changes) => void editorActions.updateBlock(target, changes)}
        onUpdatePageTitle={editorActions.updatePageTitle}
      />
      <QuickSwitcherDialog
        activeIndex={quickSwitcher.activeIndex}
        isOpen={quickSwitcher.isOpen}
        onActiveIndexChange={quickSwitcher.setActiveIndex}
        onClose={quickSwitcher.closeQuickSwitcher}
        onQueryChange={quickSwitcher.updateQuery}
        onSelect={quickSwitcher.selectResult}
        query={quickSwitcher.query}
        results={quickSwitcher.results}
      />
    </WorkspaceLayout>
  );

}

function isEditableElement(element: Element | null) {
  return Boolean(element?.closest("input,textarea,select,[contenteditable]"));
}
