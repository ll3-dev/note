import { useCallback } from "react";
import { noteApi } from "@/mainview/lib/rpc";
import type { Block, BlockProps } from "@/shared/contracts";
import { useBlockFocus } from "@/mainview/features/page/hooks/useBlockFocus";
import { useBlockKeyboardFocus } from "@/mainview/features/page/hooks/useBlockKeyboardFocus";
import { WorkspaceEditorPane } from "./components/WorkspaceEditorPane";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { QuickSwitcherDialog } from "./components/QuickSwitcherDialog";
import { useBlockTextSync } from "./hooks/useBlockTextSync";
import { useHistoryMouseNavigation } from "./hooks/useHistoryMouseNavigation";
import { useMainNavigationCommand } from "./hooks/useMainNavigationCommand";
import { useWorkspacePageEditorController } from "./hooks/useWorkspacePageEditorController";
import { useQuickSwitcher } from "./hooks/useQuickSwitcher";
import { useRestorePageLinkAction } from "./hooks/useRestorePageLinkAction";
import { useWorkspaceMutations } from "./hooks/useWorkspaceMutations";
import { navigateToPage, useWorkspaceNavigation } from "./hooks/useWorkspaceNavigation";
import { useWorkspacePageNavigation } from "./hooks/useWorkspacePageNavigation";
import { useWorkspacePagesReconcile } from "./hooks/useWorkspacePagesReconcile";
import { useWorkspaceRoutePageSelection } from "./hooks/useWorkspaceRoutePageSelection";
import { useWorkspaceScreenCommands } from "./hooks/useWorkspaceScreenCommands";
import { useWorkspaceShellStore } from "./hooks/useWorkspaceShellStore";
import { useWorkspaceQueries } from "./hooks/useWorkspaceQueries";

type WorkspaceScreenProps = {
  routePageId: string | null;
};

export function WorkspaceScreen({ routePageId }: WorkspaceScreenProps) {
  const shell = useWorkspaceShellStore();
  const activePageId = routePageId ?? shell.selectedPageId;
  const { archivedPagesQuery, backlinksQuery, databaseStatusQuery, pageDocumentQuery, pagesQuery, refreshWorkspace } = useWorkspaceQueries(activePageId);

  const { createBlockMutation, createBlocks, deletePage, deleteBlocks: deleteBlocksBatch, createLinkedPage, createPageMutation, deleteBlockMutation, moveBlocks, movePageMutation, restorePage, updatePageMutation, updateBlockMutation } = useWorkspaceMutations({
    navigateToPage: async (pageId) => {
      await navigateToPage(navigate, pageId);
    },
    onPageCreated: (page) => {
      shell.openPageTab(page);
      shell.setPageTitleDraft("");
    },
    onPageUpdated: (page) => {
      shell.renamePageRefs(page);
    }
  });

  const pages = pagesQuery.data ?? [];
  const archivedPages = archivedPagesQuery.data ?? [];
  useWorkspacePagesReconcile({
    isLoaded: pagesQuery.isSuccess,
    pages,
    reconcilePages: shell.reconcilePages
  });
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
    useWorkspaceNavigation({
      activeTabId: shell.activeTabId,
      closeTab: shell.closeTab,
      closeWindow: () => noteApi.closeMainWindow(),
      flushBeforeNavigate: flushAllTextDrafts,
      openPageTab: shell.openPageTab,
      setActiveTabId: shell.setActiveTabId,
      tabs: shell.tabs
    });
  const { navigateTabHistory, openPage, openPageById } =
    useWorkspacePageNavigation({
      activeTabId: shell.activeTabId,
      flushAllTextDrafts,
      navigate,
      navigateActiveTabToPage: shell.navigateActiveTabToPage,
      openPageTab: shell.openPageTab,
      pages,
      syncActiveTabToPage: shell.syncActiveTabToPage,
      tabs: shell.tabs
    });
  const restorePageLink = useRestorePageLinkAction({
    flushAllTextDrafts,
    navigate,
    restorePage
  });
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
  const { historyNavigation } = useWorkspaceScreenCommands({
    activeTabId: shell.activeTabId,
    closeActiveTab,
    navigateTabHistory,
    onOpenQuickSwitcher: quickSwitcher.openQuickSwitcher,
    tabs: shell.tabs,
    toggleSidebar: shell.toggleSidebar
  });
  useHistoryMouseNavigation({ navigateTabHistory });
  useMainNavigationCommand({ navigateTabHistory });
  const editorController = useWorkspacePageEditorController({
    clearPendingText,
    createBlockMutation,
    createBlocks,
    createLinkedPage,
    createPageMutation,
    deleteBlockMutation,
    deleteBlocksBatch,
    flushDocument: () => {
      void pageDocumentQuery.refetch();
    },
    flushAllTextDrafts,
    flushQueuedTextDraft,
    flushTextDraft,
    focusNextBlock,
    focusPreviousBlock,
    moveBlocks,
    onRestorePageLink: restorePageLink,
    openPage,
    openPageById,
    pageTitleDraft: shell.pageTitleDraft,
    queueTextDraft,
    refetchDocument: async () => (await pageDocumentQuery.refetch()).data ?? null,
    saveStatus,
    selectedDocument,
    setFocusBlockId,
    updateBlockMutation,
    updatePageMutation
  });

  useWorkspaceRoutePageSelection({
    navigate,
    pages,
    pagesLoaded: pagesQuery.isSuccess,
    routePageId,
    setSelectedPageId: shell.setSelectedPageId,
    syncActiveTabToPage: shell.syncActiveTabToPage
  });

  return (
    <WorkspaceLayout
      activePageId={activePageId}
      blocksCount={databaseStatusQuery.data?.blocksCount ?? 0}
      historyNavigation={historyNavigation}
      isCreatingPage={createPageMutation.isPending}
      onCloseTab={closeWorkspaceTab}
      onCopyCurrentPageMarkdown={() => void editorController.copyCurrentPageMarkdown()}
      onCreatePage={editorController.editorActions.handleCreatePage}
      onCreateUntitledPage={() => createPageMutation.mutate("")}
      onDeletePage={(page) => {
        void flushAllTextDrafts().then(() => deletePage(page));
      }}
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
      saveStatus={editorController.saveStatus}
      sqliteVersion={databaseStatusQuery.data?.sqliteVersion}
    >
      <WorkspaceEditorPane
        backlinks={backlinksQuery.data ?? []}
        document={selectedDocument}
        editorPages={[...pages, ...archivedPages]}
        isCreatingPage={createPageMutation.isPending}
        isLoading={pagesQuery.isLoading}
        onCreateUntitledPage={() => createPageMutation.mutate("")}
        onOpenQuickSwitcher={quickSwitcher.openQuickSwitcher}
        onSelectPage={selectPage}
        pages={pages}
        pageEditorProps={editorController.pageEditorProps}
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
