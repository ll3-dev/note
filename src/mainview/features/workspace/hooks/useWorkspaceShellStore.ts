import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";

export function useWorkspaceShellStore() {
  return {
    activeTabId: useWorkspaceStore((state) => state.activeTabId),
    closeTab: useWorkspaceStore((state) => state.closeTab),
    navigateActiveTabToPage: useWorkspaceStore((state) => state.navigateActiveTabToPage),
    openPageTab: useWorkspaceStore((state) => state.openPageTab),
    pageTitleDraft: useWorkspaceStore((state) => state.pageTitleDraft),
    reconcilePages: useWorkspaceStore((state) => state.reconcilePages),
    renamePageRefs: useWorkspaceStore((state) => state.renamePageRefs),
    selectedPageId: useWorkspaceStore((state) => state.selectedPageId),
    setActiveTabId: useWorkspaceStore((state) => state.setActiveTabId),
    setPageTitleDraft: useWorkspaceStore((state) => state.setPageTitleDraft),
    setSelectedPageId: useWorkspaceStore((state) => state.setSelectedPageId),
    syncActiveTabToPage: useWorkspaceStore((state) => state.syncActiveTabToPage),
    tabs: useWorkspaceStore((state) => state.tabs),
    toggleSidebar: useWorkspaceStore((state) => state.toggleSidebar)
  };
}
