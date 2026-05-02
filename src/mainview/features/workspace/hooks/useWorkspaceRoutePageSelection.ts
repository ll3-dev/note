import { useCallback } from "react";
import type { Page } from "@/shared/contracts";
import { navigateToPage } from "./useWorkspaceNavigation";
import { useInitialPageSelection } from "./useInitialPageSelection";

type UseWorkspaceRoutePageSelectionOptions = {
  navigate: (options: { replace?: boolean; to: string }) => Promise<void> | void;
  pages: Page[];
  pagesLoaded: boolean;
  routePageId: string | null;
  setSelectedPageId: (pageId: string | null) => void;
  syncActiveTabToPage: (page: Page) => void;
};

export function useWorkspaceRoutePageSelection({
  navigate,
  pages,
  pagesLoaded,
  routePageId,
  setSelectedPageId,
  syncActiveTabToPage
}: UseWorkspaceRoutePageSelectionOptions) {
  const handleMissingRoutePage = useCallback(() => {
    const fallbackPage = pages[pages.length - 1] ?? null;

    if (fallbackPage) {
      void navigateToPage(navigate, fallbackPage.id, true);
    } else {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, pages]);

  useInitialPageSelection({
    onMissingRoutePage: handleMissingRoutePage,
    pages,
    pagesLoaded,
    routePageId,
    setSelectedPageId,
    syncActiveTabToPage
  });
}
