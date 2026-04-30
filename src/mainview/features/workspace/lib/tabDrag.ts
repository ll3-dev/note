import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";

export type TabDropPlacement = "before" | "after";

export type TabDropTarget = {
  placement: TabDropPlacement;
  tabId: string;
};

export function getTabDropPlacement(
  clientX: number,
  target: HTMLElement
): TabDropPlacement {
  const rect = target.getBoundingClientRect();

  return clientX < rect.left + rect.width / 2 ? "before" : "after";
}

export function getAfterTabIdForMovingTab(
  tabs: WorkspaceTab[],
  sourceTabId: string,
  targetTabId: string,
  placement: TabDropPlacement
) {
  const orderedTabs = tabs.filter((tab) => tab.id !== sourceTabId);
  const targetIndex = orderedTabs.findIndex((tab) => tab.id === targetTabId);

  if (targetIndex < 0) {
    return null;
  }

  if (placement === "after") {
    return targetTabId;
  }

  return targetIndex > 0 ? orderedTabs[targetIndex - 1].id : null;
}
