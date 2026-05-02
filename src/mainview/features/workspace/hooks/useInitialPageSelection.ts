import { useLayoutEffect } from "react";
import type { Page } from "@/shared/contracts";

type UseInitialPageSelectionOptions = {
  pages: Page[];
  routePageId: string | null;
  setSelectedPageId: (pageId: string | null) => void;
  syncActiveTabToPage: (page: Page) => void;
};

export function useInitialPageSelection({
  pages,
  routePageId,
  setSelectedPageId,
  syncActiveTabToPage
}: UseInitialPageSelectionOptions) {
  useLayoutEffect(() => {
    if (routePageId) {
      setSelectedPageId(routePageId);
      const routePage = pages.find((page) => page.id === routePageId);

      if (routePage) {
        syncActiveTabToPage(routePage);
      }
    }
  }, [pages, routePageId, setSelectedPageId, syncActiveTabToPage]);
}
