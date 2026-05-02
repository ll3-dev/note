import { useLayoutEffect } from "react";
import type { Page } from "@/shared/contracts";

type UseInitialPageSelectionOptions = {
  onMissingRoutePage: () => void;
  pages: Page[];
  pagesLoaded: boolean;
  routePageId: string | null;
  setSelectedPageId: (pageId: string | null) => void;
  syncActiveTabToPage: (page: Page) => void;
};

export function useInitialPageSelection({
  onMissingRoutePage,
  pages,
  pagesLoaded,
  routePageId,
  setSelectedPageId,
  syncActiveTabToPage
}: UseInitialPageSelectionOptions) {
  useLayoutEffect(() => {
    if (!routePageId) {
      return;
    }

    const routePage = pages.find((page) => page.id === routePageId);

    if (routePage) {
      setSelectedPageId(routePageId);
      syncActiveTabToPage(routePage);
      return;
    }

    if (pagesLoaded) {
      setSelectedPageId(null);
      onMissingRoutePage();
    }
  }, [
    onMissingRoutePage,
    pages,
    pagesLoaded,
    routePageId,
    setSelectedPageId,
    syncActiveTabToPage
  ]);
}
