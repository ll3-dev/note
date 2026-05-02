import { useEffect } from "react";
import type { Page } from "@/shared/contracts";

type UseWorkspacePagesReconcileOptions = {
  isLoaded: boolean;
  pages: Page[];
  reconcilePages: (pages: Page[]) => void;
};

export function useWorkspacePagesReconcile({
  isLoaded,
  pages,
  reconcilePages
}: UseWorkspacePagesReconcileOptions) {
  useEffect(() => {
    if (isLoaded) {
      reconcilePages(pages);
    }
  }, [isLoaded, pages, reconcilePages]);
}
