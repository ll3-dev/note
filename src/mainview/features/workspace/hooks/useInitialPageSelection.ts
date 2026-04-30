import { useNavigate } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import type { Page } from "@/shared/contracts";
import { navigateToPage } from "./useWorkspaceNavigation";

type UseInitialPageSelectionOptions = {
  activePageId: string | null;
  navigate: ReturnType<typeof useNavigate>;
  openPageTab: (page: Page) => void;
  pages: Page[];
  routePageId: string | null;
  setSelectedPageId: (pageId: string | null) => void;
};

export function useInitialPageSelection({
  activePageId,
  navigate,
  openPageTab,
  pages,
  routePageId,
  setSelectedPageId
}: UseInitialPageSelectionOptions) {
  const hasOpenedInitialPage = useRef(false);

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

  useLayoutEffect(() => {
    if (!activePageId && pages[0] && !hasOpenedInitialPage.current) {
      hasOpenedInitialPage.current = true;
      openPageTab(pages[0]);
      void navigateToPage(navigate, pages[0].id, true);
    }
  }, [activePageId, navigate, openPageTab, pages]);
}
