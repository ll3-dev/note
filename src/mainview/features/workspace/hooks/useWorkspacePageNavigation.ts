import { useCallback, useMemo } from "react";
import type { useNavigate } from "@tanstack/react-router";
import type { Page } from "@/shared/contracts";
import type { OpenPageLinkOptions } from "@/mainview/features/page/types/blockEditorTypes";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";
import { navigateToPage } from "./useWorkspaceNavigation";

type UseWorkspacePageNavigationOptions = {
  activeTabId: string | null;
  flushAllTextDrafts: () => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
  navigateActiveTabToPage: (page: PageRef) => void;
  openPageTab: (page: PageRef) => void;
  pages: Page[];
  syncActiveTabToPage: (page: PageRef) => void;
  tabs: WorkspaceTab[];
};

type PageRef = {
  id: string;
  title: string;
};

export function useWorkspacePageNavigation({
  activeTabId,
  flushAllTextDrafts,
  navigate,
  navigateActiveTabToPage,
  openPageTab,
  pages,
  syncActiveTabToPage,
  tabs
}: UseWorkspacePageNavigationOptions) {
  const pagesById = useMemo(
    () => new Map(pages.map((page) => [page.id, page])),
    [pages]
  );

  const openPage = useCallback(
    async (page: Page, options?: OpenPageLinkOptions) => {
      await flushAllTextDrafts();

      if (options?.newTab) {
        openPageTab(page);
      } else {
        navigateActiveTabToPage(page);
      }

      await navigateToPage(navigate, page.id);
    },
    [flushAllTextDrafts, navigate, navigateActiveTabToPage, openPageTab]
  );

  const openPageById = useCallback(
    async (pageId: string, options?: OpenPageLinkOptions) => {
      const page = pagesById.get(pageId);

      if (!page) {
        return;
      }

      await openPage(page, options);
    },
    [openPage, pagesById]
  );

  const navigateTabHistory = useCallback(
    async (direction: "back" | "forward") => {
      const activeTab = tabs.find((tab) => tab.id === activeTabId);
      const target =
        direction === "back"
          ? activeTab?.history?.back.at(-1)
          : activeTab?.history?.forward[0];
      const page = target ? pagesById.get(target.id) ?? target : null;

      if (!page) {
        return;
      }

      await flushAllTextDrafts();
      syncActiveTabToPage(page);
      await navigateToPage(navigate, page.id, true);
    },
    [activeTabId, flushAllTextDrafts, navigate, pagesById, syncActiveTabToPage, tabs]
  );

  return { navigateTabHistory, openPage, openPageById };
}
