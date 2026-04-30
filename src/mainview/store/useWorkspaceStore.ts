import { create } from "zustand";

type WorkspacePageRef = {
  id: string;
  title: string;
};

export type WorkspaceTab = {
  id: string;
  pageId: string;
  title: string;
};

type WorkspaceState = {
  selectedPageId: string | null;
  activeTabId: string | null;
  expandedPageIds: string[];
  isSidebarCollapsed: boolean;
  pageTitleDraft: string;
  sidebarWidth: number;
  tabs: WorkspaceTab[];
  closeTab: (tabId: string) => void;
  openPageTab: (page: WorkspacePageRef) => void;
  reorderTabs: (
    sourceTabId: string,
    targetTabId: string,
    placement: "before" | "after"
  ) => void;
  renamePageRefs: (page: WorkspacePageRef) => void;
  toggleExpandedPage: (pageId: string) => void;
  setSelectedPageId: (pageId: string | null) => void;
  setActiveTabId: (tabId: string) => void;
  setPageTitleDraft: (title: string) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeTabId: null,
  expandedPageIds: [],
  isSidebarCollapsed: false,
  pageTitleDraft: "",
  selectedPageId: null,
  sidebarWidth: 320,
  tabs: [],
  closeTab: (tabId) =>
    set((state) => {
      const remainingTabs = state.tabs.filter((tab) => tab.id !== tabId);

      if (state.activeTabId !== tabId) {
        return { tabs: remainingTabs };
      }

      const nextTab = remainingTabs[remainingTabs.length - 1] ?? null;

      return {
        activeTabId: nextTab?.id ?? null,
        selectedPageId: nextTab?.pageId ?? null,
        tabs: remainingTabs
      };
    }),
  openPageTab: (page) =>
    set((state) => {
      const tab: WorkspaceTab = {
        id: page.id,
        pageId: page.id,
        title: page.title
      };
      const hasTab = state.tabs.some((item) => item.id === tab.id);
      const tabs = hasTab
        ? state.tabs.map((item) => (item.id === tab.id ? tab : item))
        : [...state.tabs, tab];

      return {
        activeTabId: tab.id,
        selectedPageId: page.id,
        tabs
      };
    }),
  reorderTabs: (sourceTabId, targetTabId, placement) =>
    set((state) => {
      const sourceIndex = state.tabs.findIndex((tab) => tab.id === sourceTabId);
      const targetIndex = state.tabs.findIndex((tab) => tab.id === targetTabId);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return {};
      }

      const orderedTabs = state.tabs.filter((tab) => tab.id !== sourceTabId);
      const insertionTargetIndex = orderedTabs.findIndex(
        (tab) => tab.id === targetTabId
      );

      if (insertionTargetIndex < 0) {
        return {};
      }

      const sourceTab = state.tabs[sourceIndex];
      const insertIndex =
        placement === "before" ? insertionTargetIndex : insertionTargetIndex + 1;
      const tabs = [...orderedTabs];
      tabs.splice(insertIndex, 0, sourceTab);

      return { tabs };
    }),
  renamePageRefs: (page) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.pageId === page.id ? { ...tab, title: page.title } : tab
      )
    })),
  setActiveTabId: (tabId) =>
    set((state) => {
      const tab = state.tabs.find((item) => item.id === tabId);

      if (!tab) {
        return {};
      }

      return {
        activeTabId: tab.id,
        selectedPageId: tab.pageId
      };
    }),
  setPageTitleDraft: (title) => set({ pageTitleDraft: title }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSelectedPageId: (pageId) => set({ selectedPageId: pageId }),
  toggleExpandedPage: (pageId) =>
    set((state) => ({
      expandedPageIds: state.expandedPageIds.includes(pageId)
        ? state.expandedPageIds.filter((id) => id !== pageId)
        : [...state.expandedPageIds, pageId]
    })),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
}));
