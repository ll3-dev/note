import { useCallback, useMemo, type SyntheticEvent } from "react";
import { useGlobalKeyboardShortcuts } from "@/mainview/features/commands/useGlobalKeyboardShortcuts";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Block, Page } from "../../../shared/contracts";
import { useBlockFocus } from "../page/hooks/useBlockFocus";
import { useBlockKeyboardFocus } from "../page/hooks/useBlockKeyboardFocus";
import type { CreateBlockDraft } from "../page/lib/blockEditingBehavior";
import type { BlockEditorUpdate } from "../page/types/blockEditorTypes";
import { WorkspaceEditorPane } from "./components/WorkspaceEditorPane";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { useBlockBatchActions } from "./hooks/useBlockBatchActions";
import { useBlockTextSync } from "./hooks/useBlockTextSync";
import { useInitialPageSelection } from "./hooks/useInitialPageSelection";
import { useMarkdownClipboard } from "./hooks/useMarkdownClipboard";
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
  const { databaseStatusQuery, pageDocumentQuery, pagesQuery, refreshWorkspace } = useWorkspaceQueries(activePageId);

  const { createBlockMutation, createPageMutation, deleteBlockMutation, moveBlockMutation, movePageMutation, updatePageMutation, updateBlockMutation } = useWorkspaceMutations({
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
    async (block: Block, text: string) => {
      await updateBlockMutation.mutateAsync({ block, text });
    },
    [updateBlockMutation]
  );
  const { clearPendingText, flushAllTextDrafts, flushQueuedTextDraft, flushTextDraft, queueTextDraft, status: saveStatus } =
    useBlockTextSync({ saveText: saveBlockText });
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
  const { copyCurrentPageMarkdown, pasteMarkdown } = useMarkdownClipboard({
    clearPendingText,
    createBlock: createBlockMutation.mutateAsync,
    flushAllTextDrafts,
    refetchDocument: async () => (await pageDocumentQuery.refetch()).data ?? null,
    selectedDocument,
    setFocusBlockId,
    updateBlock: updateBlockMutation.mutateAsync
  });
  const { deleteBlocks, duplicateBlocks } = useBlockBatchActions({
    clearPendingText,
    createBlock: createBlockMutation.mutateAsync,
    deleteBlock: deleteBlockMutation.mutateAsync,
    flushAllTextDrafts,
    setFocusBlockId
  });

  useGlobalKeyboardShortcuts({
    activeScopes: ["global", "workspace"],
    commands: WORKSPACE_COMMANDS,
    context: workspaceCommandContext,
    keybindings
  });
  useInitialPageSelection({
    activePageId,
    navigate,
    openPageTab,
    pages,
    routePageId,
    setSelectedPageId
  });

  function handleCreatePage(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = pageTitleDraft.trim();
    if (title) {
      createPageMutation.mutate(title);
    }
  }

  async function createBlockAfter(block: Block, draft?: CreateBlockDraft) {
    await flushAllTextDrafts();
    const created = await createBlockMutation.mutateAsync({
      afterBlockId: block.id,
      pageId: block.pageId,
      props: draft?.props,
      text: draft?.text,
      type: draft?.type
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

  function updatePageTitle(page: Page, title: string) {
    const nextTitle = title.trim();
    if (nextTitle && nextTitle !== page.title) {
      updatePageMutation.mutate({ page, title: nextTitle });
    }
  }

  function focusFirstBlock() {
    const firstBlock = selectedDocument?.blocks[0];
    if (firstBlock) {
      setFocusBlockId(firstBlock.id, "start");
    }
  }

  return (
    <WorkspaceLayout
      activePageId={activePageId}
      blocksCount={databaseStatusQuery.data?.blocksCount ?? 0}
      isCreatingPage={createPageMutation.isPending}
      onCloseTab={closeWorkspaceTab}
      onCopyCurrentPageMarkdown={() => void copyCurrentPageMarkdown()}
      onCreatePage={handleCreatePage}
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
        document={selectedDocument}
        isLoading={pagesQuery.isLoading}
        onCreateBlockAfter={createBlockAfter}
        onDeleteBlock={(target) => {
          void flushAllTextDrafts().then(() => deleteBlockMutation.mutate(target));
        }}
        onDeleteBlocks={(targets) => void deleteBlocks(targets)}
        onDuplicateBlocks={(targets) => duplicateBlocks(targets)}
        onFocusFirstBlock={focusFirstBlock}
        onFocusNextBlock={focusNextBlock}
        onFocusPreviousBlock={focusPreviousBlock}
        onMoveBlock={(target, afterBlockId) => {
          void flushAllTextDrafts().then(() =>
            moveBlockMutation.mutate({ afterBlockId, block: target })
          );
        }}
        onPasteMarkdown={pasteMarkdown}
        onTextDraftChange={queueTextDraft}
        onTextDraftFlush={flushTextDraft}
        onTextHistoryApply={queueTextDraft}
        onUpdateBlock={(target, changes) => void updateBlock(target, changes)}
        onUpdatePageTitle={updatePageTitle}
      />
    </WorkspaceLayout>
  );
}
