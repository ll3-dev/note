import { useNavigate } from "@tanstack/react-router";
import {
  FormEvent,
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Block } from "../../../shared/contracts";
import { EmptyEditorState } from "./components/EmptyEditorState";
import { PageEditor } from "./components/PageEditor";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { useBlockFocus } from "./hooks/useBlockFocus";
import { useWorkspaceMutations } from "./hooks/useWorkspaceMutations";
import { useWorkspaceQueries } from "./hooks/useWorkspaceQueries";

type WorkspaceScreenProps = {
  routePageId: string | null;
};

export function WorkspaceScreen({ routePageId }: WorkspaceScreenProps) {
  const navigate = useNavigate();
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const isSidebarCollapsed = useWorkspaceStore(
    (state) => state.isSidebarCollapsed
  );
  const openPageTab = useWorkspaceStore((state) => state.openPageTab);
  const selectedPageId = useWorkspaceStore((state) => state.selectedPageId);
  const setActiveTabId = useWorkspaceStore((state) => state.setActiveTabId);
  const setSelectedPageId = useWorkspaceStore((state) => state.setSelectedPageId);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const hasOpenedInitialPage = useRef(false);
  const [pageTitle, setPageTitle] = useState("");
  const activePageId = routePageId ?? selectedPageId;
  const {
    databaseStatusQuery,
    pageDocumentQuery,
    pagesQuery,
    refreshWorkspace
  } = useWorkspaceQueries(activePageId);

  const {
    createBlockMutation,
    createPageMutation,
    deleteBlockMutation,
    updateBlockMutation
  } = useWorkspaceMutations({
    navigateToPage: async (pageId) => {
      await navigateToPage(navigate, pageId);
    },
    onPageCreated: (page) => {
      openPageTab(page);
      setPageTitle("");
    }
  });

  const pages = pagesQuery.data ?? [];
  const selectedDocument = pageDocumentQuery.data ?? null;
  const { setFocusBlockId } = useBlockFocus(selectedDocument);

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
    const title = pageTitle.trim();

    if (title) {
      createPageMutation.mutate(title);
    }
  }

  function selectPage(page: (typeof pages)[number]) {
    openPageTab(page);
    void navigateToPage(navigate, page.id);
  }

  function selectTab(tabId: string) {
    const tab = tabs.find((item) => item.id === tabId);

    if (!tab) {
      return;
    }

    setActiveTabId(tabId);
    void navigateToPage(navigate, tab.pageId);
  }

  function closeWorkspaceTab(event: MouseEvent<HTMLButtonElement>, tabId: string) {
    event.stopPropagation();

    const remainingTabs = tabs.filter((tab) => tab.id !== tabId);
    const nextTab =
      activeTabId === tabId ? remainingTabs[remainingTabs.length - 1] : null;

    closeTab(tabId);

    if (nextTab) {
      void navigateToPage(navigate, nextTab.pageId, true);
    } else if (activeTabId === tabId) {
      void navigate({ to: "/", replace: true });
    }
  }

  async function createBlockAfter(block: Block) {
    const created = await createBlockMutation.mutateAsync({
      afterBlockId: block.id,
      pageId: block.pageId
    });

    setFocusBlockId(created.id);
  }

  function focusPreviousBlock(block: Block) {
    const blocks = selectedDocument?.blocks ?? [];
    const index = blocks.findIndex((item) => item.id === block.id);
    const previous = index > 0 ? blocks[index - 1] : null;
    if (previous) setFocusBlockId(previous.id);
  }

  return (
    <WorkspaceLayout
      activePageId={activePageId}
      activeTabId={activeTabId}
      blocksCount={databaseStatusQuery.data?.blocksCount ?? 0}
      isCreatingPage={createPageMutation.isPending}
      isSidebarCollapsed={isSidebarCollapsed}
      onCloseTab={closeWorkspaceTab}
      onCreatePage={handleCreatePage}
      onCreateUntitledPage={() => createPageMutation.mutate("Untitled")}
      onPageTitleChange={setPageTitle}
      onRefreshWorkspace={() => void refreshWorkspace()}
      onSelectPage={selectPage}
      onSelectTab={selectTab}
      onToggleSidebar={toggleSidebar}
      pageTitle={pageTitle}
      pages={pages}
      pagesCount={databaseStatusQuery.data?.pagesCount ?? 0}
      sqliteVersion={databaseStatusQuery.data?.sqliteVersion}
      tabs={tabs}
    >
      <div className="mx-auto flex h-full w-full max-w-[920px] flex-col px-10 py-8">
        {selectedDocument ? (
          <PageEditor
            document={selectedDocument}
            isCreatingBlock={!activePageId || createBlockMutation.isPending}
            isDeletingBlock={deleteBlockMutation.isPending}
            onCreateBlock={() =>
              activePageId
                ? createBlockMutation.mutate({ pageId: activePageId })
                : undefined
            }
            onCreateBlockAfter={createBlockAfter}
            onDeleteBlock={(target) => deleteBlockMutation.mutate(target)}
            onFocusPreviousBlock={focusPreviousBlock}
            onUpdateBlock={(target, changes) =>
              updateBlockMutation.mutate({ block: target, ...changes })
            }
          />
        ) : (
          <EmptyEditorState isLoading={pagesQuery.isLoading} />
        )}
      </div>
    </WorkspaceLayout>
  );
}

async function navigateToPage(
  navigate: ReturnType<typeof useNavigate>,
  pageId: string,
  replace = false
) {
  await navigate({
    to: "/pages/$pageId",
    params: { pageId },
    replace
  });
}
