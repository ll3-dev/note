import { ChevronLeft, ChevronRight, PanelLeft, Plus } from "lucide-react";
import { useCallback, type MouseEvent } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";
import { useTabDrag } from "@/mainview/features/workspace/hooks/useTabDrag";
import {
  getDropPlacementForTab,
  type TabDropPlacement,
  type TabDropTarget
} from "@/mainview/features/workspace/lib/tabDrag";
import { TabDragGhost } from "./TabDragGhost";
import { WorkspaceTabButton } from "./WorkspaceTabButton";

type WorkspaceTitleBarProps = {
  activeTabId: string | null;
  historyNavigation: WorkspaceHistoryNavigation;
  isCreatingPage: boolean;
  isSidebarCollapsed: boolean;
  onCloseTab: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onCreateUntitledPage: () => void;
  onReorderTab: (
    sourceTabId: string,
    targetTabId: string,
    placement: TabDropPlacement
  ) => void;
  onSelectTab: (tabId: string) => void;
  onToggleSidebar: () => void;
  sidebarOffset: number;
  tabs: WorkspaceTab[];
};

export type WorkspaceHistoryNavigation = {
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
};

export function WorkspaceTitleBar({
  activeTabId,
  historyNavigation,
  isCreatingPage,
  isSidebarCollapsed,
  onCloseTab,
  onCreateUntitledPage,
  onReorderTab,
  onSelectTab,
  onToggleSidebar,
  sidebarOffset,
  tabs
}: WorkspaceTitleBarProps) {
  const handleDropTab = useCallback(
    (sourceTabId: string, target: TabDropTarget) => {
      onReorderTab(sourceTabId, target.tabId, target.placement);
    },
    [onReorderTab]
  );
  const { draggedTabId, dropTarget, pressTab, preview } = useTabDrag({
    onDropTab: handleDropTab
  });

  return (
    <>
      <header
        className={cn(
          "workspace-titlebar electrobun-webkit-app-region-no-drag absolute right-0 top-0 z-20 flex h-8 items-center gap-1 overflow-hidden bg-sidebar/95 pr-1.5 transition-[height,opacity,left] duration-150",
          isSidebarCollapsed ? "pl-[76px]" : "pl-2"
        )}
        style={{ left: sidebarOffset }}
      >
        {isSidebarCollapsed ? (
          <Button
            aria-label="사이드바 열기"
            className="electrobun-webkit-app-region-no-drag"
            onClick={onToggleSidebar}
            size="icon-xs"
            variant="ghost"
          >
            <PanelLeft className="size-3.5" />
          </Button>
        ) : null}

        <div className="electrobun-webkit-app-region-no-drag flex items-center gap-0.5">
          <Button
            aria-label="뒤로 가기"
            className="electrobun-webkit-app-region-no-drag"
            disabled={!historyNavigation.canGoBack}
            onClick={historyNavigation.goBack}
            size="icon-xs"
            title="뒤로 가기 (⌘←)"
            variant="ghost"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            aria-label="앞으로 가기"
            className="electrobun-webkit-app-region-no-drag"
            disabled={!historyNavigation.canGoForward}
            onClick={historyNavigation.goForward}
            size="icon-xs"
            title="앞으로 가기 (⌘→)"
            variant="ghost"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        <div
          className="electrobun-webkit-app-region-no-drag flex min-w-0 max-w-[calc(100%-2rem)] flex-none items-center gap-1 overflow-x-auto"
          role="tablist"
        >
          {tabs.length === 0 ? (
            <div className="flex h-6 items-center px-2 text-xs font-medium text-muted-foreground">
              Note
            </div>
          ) : null}
          {tabs.map((tab) => (
            <WorkspaceTabButton
              draggedTabId={draggedTabId}
              dropPlacement={getDropPlacementForTab(dropTarget, tab.id)}
              isActive={tab.id === activeTabId}
              isDragged={draggedTabId === tab.id}
              key={tab.id}
              onClose={onCloseTab}
              onPressDrag={pressTab}
              onSelect={onSelectTab}
              tab={tab}
            />
          ))}
        </div>

        <div
          aria-hidden="true"
          className="electrobun-webkit-app-region-drag h-full min-w-3 flex-1"
        />

        <Button
          aria-label="새 페이지"
          className="electrobun-webkit-app-region-no-drag"
          disabled={isCreatingPage}
          onClick={onCreateUntitledPage}
          size="icon-xs"
          variant="ghost"
        >
          <Plus className="size-3.5" />
        </Button>
      </header>

      {preview ? <TabDragGhost preview={preview} /> : null}
    </>
  );
}
