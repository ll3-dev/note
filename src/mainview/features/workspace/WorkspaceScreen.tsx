import { useCallback, useEffect, useMemo } from "react";
import { useGlobalKeyboardShortcuts } from "@/mainview/features/commands/useGlobalKeyboardShortcuts";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import { noteApi } from "@/mainview/lib/rpc";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Block, BlockProps } from "@/shared/contracts";
import { useBlockFocus } from "@/mainview/features/page/hooks/useBlockFocus";
import { useBlockKeyboardFocus } from "@/mainview/features/page/hooks/useBlockKeyboardFocus";
import { WorkspaceEditorPane } from "./components/WorkspaceEditorPane";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { QuickSwitcherDialog } from "./components/QuickSwitcherDialog";
import { useBlockTextSync } from "./hooks/useBlockTextSync";
import { useHistoryMouseNavigation } from "./hooks/useHistoryMouseNavigation";
import { useInitialPageSelection } from "./hooks/useInitialPageSelection";
import { useMainNavigationCommand } from "./hooks/useMainNavigationCommand";
import { useWorkspacePageEditorController } from "./hooks/useWorkspacePageEditorController";
import { useQuickSwitcher } from "./hooks/useQuickSwitcher";
import { useWorkspaceMutations } from "./hooks/useWorkspaceMutations";
import { navigateToPage, useWorkspaceNavigation } from "./hooks/useWorkspaceNavigation";
import { useWorkspacePageNavigation } from "./hooks/useWorkspacePageNavigation";
import { useWorkspaceQueries } from "./hooks/useWorkspaceQueries";
import { WORKSPACE_COMMANDS } from "./lib/workspaceCommands";

type WorkspaceScreenProps = {
  routePageId: string | null;
};

export function WorkspaceScreen({ routePageId }: WorkspaceScreenProps) {
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const navigateActiveTabToPage = useWorkspaceStore((state) => state.navigateActiveTabToPage);
  const openPageTab = useWorkspaceStore((state) => state.openPageTab);
  const pageTitleDraft = useWorkspaceStore((state) => state.pageTitleDraft);
  const reconcilePages = useWorkspaceStore((state) => state.reconcilePages);
  const renamePageRefs = useWorkspaceStore((state) => state.renamePageRefs);
  const selectedPageId = useWorkspaceStore((state) => state.selectedPageId);
  const setActiveTabId = useWorkspaceStore((state) => state.setActiveTabId);
  const setPageTitleDraft = useWorkspaceStore((state) => state.setPageTitleDraft);
  const setSelectedPageId = useWorkspaceStore((state) => state.setSelectedPageId);
  const syncActiveTabToPage = useWorkspaceStore((state) => state.syncActiveTabToPage);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const keybindings = useKeybindingStore((state) => state.keybindings);
  const activePageId = routePageId ?? selectedPageId;
  const { backlinksQuery, databaseStatusQuery, pageDocumentQuery, pagesQuery, refreshWorkspace } = useWorkspaceQueries(activePageId);

  const { createBlockMutation, createBlocks, deletePage, deleteBlocks: deleteBlocksBatch, createLinkedPage, createPageMutation, deleteBlockMutation, moveBlocks, movePageMutation, updatePageMutation, updateBlockMutation } = useWorkspaceMutations({
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
  useEffect(() => {
    if (pagesQuery.isSuccess) {
      reconcilePages(pages);
    }
  }, [pages, pagesQuery.isSuccess, reconcilePages]);
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
      activeTabId,
      closeTab,
      closeWindow: async () => {
        await noteApi.closeMainWindow();
      },
      flushBeforeNavigate: flushAllTextDrafts,
      openPageTab,
      setActiveTabId,
      tabs
    });
  const { navigateTabHistory, openPage, openPageById } =
    useWorkspacePageNavigation({
      activeTabId,
      flushAllTextDrafts,
      navigate,
      navigateActiveTabToPage,
      openPageTab,
      pages,
      syncActiveTabToPage,
      tabs
    });
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs]
  );
  const canNavigateBack = (activeTab?.history?.back.length ?? 0) > 0;
  const canNavigateForward = (activeTab?.history?.forward.length ?? 0) > 0;
  const historyNavigation = useMemo(
    () => ({
      canGoBack: canNavigateBack,
      canGoForward: canNavigateForward,
      goBack: () => void navigateTabHistory("back"),
      goForward: () => void navigateTabHistory("forward")
    }),
    [canNavigateBack, canNavigateForward, navigateTabHistory]
  );
  const handleMissingRoutePage = useCallback(() => {
    const fallbackPage = pages[pages.length - 1] ?? null;

    if (fallbackPage) {
      void navigateToPage(navigate, fallbackPage.id, true);
    } else {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, pages]);
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
      navigateBack: () => navigateTabHistory("back"),
      navigateForward: () => navigateTabHistory("forward"),
      openQuickSwitcher: quickSwitcher.openQuickSwitcher,
      toggleSidebar: () => {
        window.dispatchEvent(new CustomEvent("note-clear-block-selection"));
        toggleSidebar();
      }
    }),
    [closeActiveTab, navigateTabHistory, quickSwitcher.openQuickSwitcher, toggleSidebar]
  );
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
    openPage,
    openPageById,
    pageTitleDraft,
    pages,
    queueTextDraft,
    refetchDocument: async () => (await pageDocumentQuery.refetch()).data ?? null,
    saveStatus,
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
  useInitialPageSelection({
    onMissingRoutePage: handleMissingRoutePage,
    pages,
    pagesLoaded: pagesQuery.isSuccess,
    routePageId,
    setSelectedPageId,
    syncActiveTabToPage
  });

  return (
    <WorkspaceLayout
      activePageId={activePageId}
      blocksCount={databaseStatusQuery.data?.blocksCount ?? 0}
      historyNavigation={historyNavigation}
      isCreatingPage={createPageMutation.isPending}
      onCloseTab={closeWorkspaceTab}
      onCopyCurrentPageMarkdown={() =>
        void editorController.copyCurrentPageMarkdown()
      }
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
        isCreatingPage={createPageMutation.isPending}
        isLoading={pagesQuery.isLoading}
        onCreateUntitledPage={() => createPageMutation.mutate("")}
        onOpenQuickSwitcher={quickSwitcher.openQuickSwitcher}
        onSelectPage={selectPage}
        {...editorController.editorPaneProps}
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
