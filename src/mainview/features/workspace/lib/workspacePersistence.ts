import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";

type WorkspacePageRef = {
  id: string;
  title: string;
};

export type WorkspacePersistenceState = {
  activeTabId: string | null;
  expandedPageIds: string[];
  isSidebarCollapsed: boolean;
  selectedPageId: string | null;
  sidebarWidth: number;
  tabs: WorkspaceTab[];
};

export function reconcileWorkspacePersistence(
  state: WorkspacePersistenceState,
  pages: WorkspacePageRef[]
): WorkspacePersistenceState {
  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const tabs = state.tabs
    .filter((tab) => pagesById.has(tab.pageId))
    .map((tab) => ({
      ...tab,
      title: pagesById.get(tab.pageId)?.title ?? tab.title
    }));
  const activeTab = tabs.find((tab) => tab.id === state.activeTabId) ?? null;
  const fallbackTab = tabs[tabs.length - 1] ?? null;
  const nextActiveTab = activeTab ?? fallbackTab;
  const selectedPageId = nextActiveTab?.pageId ?? null;

  return {
    ...state,
    activeTabId: nextActiveTab?.id ?? null,
    expandedPageIds: state.expandedPageIds.filter((id) => pagesById.has(id)),
    selectedPageId,
    tabs
  };
}
