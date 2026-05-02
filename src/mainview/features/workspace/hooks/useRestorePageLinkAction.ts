import { navigateToPage } from "./useWorkspaceNavigation";

type UseRestorePageLinkActionOptions = {
  flushAllTextDrafts: () => Promise<void>;
  navigate: (options: { replace?: boolean; to: string }) => Promise<void> | void;
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
