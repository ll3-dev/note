import { useNavigate } from "@tanstack/react-router";
import { navigateToPage } from "./useWorkspaceNavigation";

type UseRestorePageLinkActionOptions = {
  flushAllTextDrafts: () => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
  restorePage: (pageId: string) => Promise<void>;
};

export function useRestorePageLinkAction({
  flushAllTextDrafts,
  navigate,
  restorePage
}: UseRestorePageLinkActionOptions) {
  return (pageId: string) => {
    void flushAllTextDrafts().then(async () => {
      await restorePage(pageId);
      await navigateToPage(navigate, pageId);
    });
  };
}
