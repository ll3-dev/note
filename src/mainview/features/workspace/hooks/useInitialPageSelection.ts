import { useLayoutEffect } from "react";
import type { Page } from "@/shared/contracts";

type UseInitialPageSelectionOptions = {
  openPageTab: (page: Page) => void;
  pages: Page[];
  routePageId: string | null;
  setSelectedPageId: (pageId: string | null) => void;
};

export function useInitialPageSelection({
  openPageTab,
  pages,
  routePageId,
  setSelectedPageId
}: UseInitialPageSelectionOptions) {
  useLayoutEffect(() => {
    if (routePageId) {
      setSelectedPageId(routePageId);
      const routePage = pages.find((page) => page.id === routePageId);

      if (routePage) {
        openPageTab(routePage);
      }
    }
  }, [openPageTab, pages, routePageId, setSelectedPageId]);
}
