import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import type { Page } from "@/shared/contracts";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";

type UseWorkspaceNavigationOptions = {
  activeTabId: string | null;
  closeTab: (tabId: string) => void;
  flushBeforeNavigate: () => Promise<void>;
  closeWindow: () => Promise<void>;
  openPageTab: (page: Page) => void;
  setActiveTabId: (tabId: string) => void;
  tabs: WorkspaceTab[];
};

export function useWorkspaceNavigation({
  activeTabId,
  closeTab,
  closeWindow,
  flushBeforeNavigate,
  openPageTab,
  setActiveTabId,
  tabs
}: UseWorkspaceNavigationOptions) {
  const navigate = useNavigate();

  async function selectPage(page: Page) {
    await flushBeforeNavigate();
    openPageTab(page);
    void navigateToPage(navigate, page.id);
  }

  async function selectTab(tabId: string) {
    const tab = tabs.find((item) => item.id === tabId);

    if (!tab) {
      return;
    }

    await flushBeforeNavigate();
    setActiveTabId(tabId);
    void navigateToPage(navigate, tab.pageId);
  }

  async function closeTabById(tabId: string) {
    await flushBeforeNavigate();

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

  async function closeActiveTab() {
    if (!activeTabId) {
      await flushBeforeNavigate();
      await closeWindow();
      return;
    }

    await closeTabById(activeTabId);
  }

  async function closeWorkspaceTab(
    event: MouseEvent<HTMLButtonElement>,
    tabId: string
  ) {
    event.stopPropagation();
    await closeTabById(tabId);
  }

  return {
    closeActiveTab,
    closeWorkspaceTab,
    navigate,
    selectPage,
    selectTab
  };
}

export async function navigateToPage(
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
