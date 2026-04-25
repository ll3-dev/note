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
  isSidebarCollapsed: boolean;
  pageTitleDraft: string;
  tabs: WorkspaceTab[];
  closeTab: (tabId: string) => void;
  openPageTab: (page: WorkspacePageRef) => void;
  setSelectedPageId: (pageId: string | null) => void;
  setActiveTabId: (tabId: string) => void;
  setPageTitleDraft: (title: string) => void;
  toggleSidebar: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeTabId: null,
  isSidebarCollapsed: false,
  pageTitleDraft: "",
  selectedPageId: null,
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
  setSelectedPageId: (pageId) => set({ selectedPageId: pageId }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
}));
