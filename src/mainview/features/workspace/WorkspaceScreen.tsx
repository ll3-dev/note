import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useGlobalKeyboardShortcuts } from "@/mainview/features/commands/useGlobalKeyboardShortcuts";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Block } from "../../../shared/contracts";
import { PageEditor } from "../page/components/PageEditor";
import { useBlockFocus } from "../page/hooks/useBlockFocus";
import { useBlockKeyboardFocus } from "../page/hooks/useBlockKeyboardFocus";
import type { BlockEditorUpdate } from "../page/types/blockEditorTypes";
import { EmptyEditorState } from "./components/EmptyEditorState";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { useBlockTextSync } from "./hooks/useBlockTextSync";
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
  const selectedPageId = useWorkspaceStore((state) => state.selectedPageId);
  const setActiveTabId = useWorkspaceStore((state) => state.setActiveTabId);
  const setPageTitleDraft = useWorkspaceStore(
    (state) => state.setPageTitleDraft
  );
  const setSelectedPageId = useWorkspaceStore((state) => state.setSelectedPageId);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const keybindings = useKeybindingStore((state) => state.keybindings);
  const hasOpenedInitialPage = useRef(false);
  const activePageId = routePageId ?? selectedPageId;
  const { databaseStatusQuery, pageDocumentQuery, pagesQuery, refreshWorkspace } =
    useWorkspaceQueries(activePageId);

  const {
    createBlockMutation,
    createPageMutation,
    deleteBlockMutation,
    moveBlockMutation,
    updateBlockMutation
  } = useWorkspaceMutations({
    navigateToPage: async (pageId) => {
      await navigateToPage(navigate, pageId);
    },
    onPageCreated: (page) => {
      openPageTab(page);
      setPageTitleDraft("");
    }
  });

  const pages = pagesQuery.data ?? [];
  const selectedDocument = pageDocumentQuery.data ?? null;
  const { setFocusBlockId } = useBlockFocus(selectedDocument);
  const { focusNextBlock, focusPreviousBlock } = useBlockKeyboardFocus(
    selectedDocument,
    setFocusBlockId
  );
  const saveBlockText = useCallback(
    async (block: Block, text: string) => {
      await updateBlockMutation.mutateAsync({ block, text });
    },
    [updateBlockMutation]
  );
  const {
    clearPendingText,
    flushAllTextDrafts,
    flushQueuedTextDraft,
    flushTextDraft,
    queueTextDraft
  } = useBlockTextSync({ saveText: saveBlockText });
  const { closeActiveTab, closeWorkspaceTab, navigate, selectPage, selectTab } =
    useWorkspaceNavigation({
      activeTabId,
      closeTab,
      flushBeforeNavigate: flushAllTextDrafts,
      openPageTab,
      setActiveTabId,
      tabs
    });
  const workspaceCommandContext = useMemo(
    () => ({ closeActiveTab, toggleSidebar }),
    [closeActiveTab, toggleSidebar]
  );

  useGlobalKeyboardShortcuts({
    activeScopes: ["global", "workspace"],
    commands: WORKSPACE_COMMANDS,
    context: workspaceCommandContext,
    keybindings
  });

  useLayoutEffect(() => {
    if (routePageId) {
      hasOpenedInitialPage.current = true;
      setSelectedPageId(routePageId);
      const routePage = pages.find((page) => page.id === routePageId);

      if (routePage) {
        openPageTab(routePage);
      }
    }
  }, [openPageTab, pages, routePageId, setSelectedPageId]);

  useEffect(() => {
    if (!activePageId && pages[0] && !hasOpenedInitialPage.current) {
      hasOpenedInitialPage.current = true;
      openPageTab(pages[0]);
      void navigateToPage(navigate, pages[0].id, true);
    }
  }, [activePageId, navigate, openPageTab, pages]);

  function handleCreatePage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = pageTitleDraft.trim();

    if (title) {
      createPageMutation.mutate(title);
    }
  }

  async function createBlockAfter(block: Block) {
    await flushAllTextDrafts();
    const created = await createBlockMutation.mutateAsync({
      afterBlockId: block.id,
      pageId: block.pageId
    });

    setFocusBlockId(created.id);
  }

  async function updateBlock(block: Block, changes: BlockEditorUpdate) {
    if (changes.text === undefined) {
      await flushQueuedTextDraft(block.id);
    }

    clearPendingText(block.id);
    updateBlockMutation.mutate({ block, ...changes });
  }

  return (
    <WorkspaceLayout
      activePageId={activePageId}
      blocksCount={databaseStatusQuery.data?.blocksCount ?? 0}
      isCreatingPage={createPageMutation.isPending}
      onCloseTab={closeWorkspaceTab}
      onCreatePage={handleCreatePage}
      onCreateUntitledPage={() => createPageMutation.mutate("Untitled")}
      onRefreshWorkspace={() => {
        void flushAllTextDrafts().then(refreshWorkspace);
      }}
      onSelectPage={selectPage}
      onSelectTab={selectTab}
      pages={pages}
      pagesCount={databaseStatusQuery.data?.pagesCount ?? 0}
      sqliteVersion={databaseStatusQuery.data?.sqliteVersion}
    >
      <div className="mx-auto flex h-full w-full max-w-[920px] flex-col px-10 py-8">
        {selectedDocument ? (
          <PageEditor
            document={selectedDocument}
            onCreateBlockAfter={createBlockAfter}
            onDeleteBlock={(target) => {
              void flushAllTextDrafts().then(() =>
                deleteBlockMutation.mutate(target)
              );
            }}
            onFocusNextBlock={focusNextBlock}
            onFocusPreviousBlock={focusPreviousBlock}
            onMoveBlock={(target, afterBlockId) => {
              void flushAllTextDrafts().then(() =>
                moveBlockMutation.mutate({ afterBlockId, block: target })
              );
            }}
            onTextDraftChange={queueTextDraft}
            onTextDraftFlush={flushTextDraft}
            onUpdateBlock={(target, changes) =>
              void updateBlock(target, changes)
            }
          />
        ) : (
          <EmptyEditorState isLoading={pagesQuery.isLoading} />
        )}
      </div>
    </WorkspaceLayout>
  );
}
