import { FileText, PanelLeft, Plus, X } from "lucide-react";
import type { DragEvent, MouseEvent } from "react";
import { useState } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";

type WorkspaceTitleBarProps = {
  activeTabId: string | null;
  isCreatingPage: boolean;
  isSidebarCollapsed: boolean;
  onCloseTab: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onCreateUntitledPage: () => void;
  onReorderTab: (sourceTabId: string, targetTabId: string) => void;
  onSelectTab: (tabId: string) => void;
  onToggleSidebar: () => void;
  sidebarOffset: number;
  tabs: WorkspaceTab[];
};

export function WorkspaceTitleBar({
  activeTabId,
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
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null);

  return (
    <header
      className={cn(
        "workspace-titlebar electrobun-webkit-app-region-drag absolute right-0 top-0 z-20 flex h-8 items-center gap-1 overflow-hidden bg-sidebar/95 pr-1.5 transition-[height,opacity,left] duration-150",
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

      <div
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        role="tablist"
      >
        {tabs.length === 0 ? (
          <div className="flex h-6 items-center px-2 text-xs font-medium text-muted-foreground">
            Note
          </div>
        ) : null}
        {tabs.map((tab) => (
          <WorkspaceTabButton
            isActive={tab.id === activeTabId}
            isDragged={draggedTabId === tab.id}
            isDropTarget={dropTargetTabId === tab.id && draggedTabId !== tab.id}
            key={tab.id}
            onClose={onCloseTab}
            onDragEnd={() => {
              setDraggedTabId(null);
              setDropTargetTabId(null);
            }}
            onDragTargetChange={setDropTargetTabId}
            onReorder={onReorderTab}
            onSelect={onSelectTab}
            onStartDrag={setDraggedTabId}
            tab={tab}
          />
        ))}
      </div>

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
  );
}

function WorkspaceTabButton({
  isActive,
  isDragged,
  isDropTarget,
  onClose,
  onDragEnd,
  onDragTargetChange,
  onReorder,
  onSelect,
  onStartDrag,
  tab
}: {
  isActive: boolean;
  isDragged: boolean;
  isDropTarget: boolean;
  onClose: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onDragEnd: () => void;
  onDragTargetChange: (tabId: string | null) => void;
  onReorder: (sourceTabId: string, targetTabId: string) => void;
  onSelect: (tabId: string) => void;
  onStartDrag: (tabId: string) => void;
  tab: WorkspaceTab;
}) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-note-tab-id", tab.id);
    onStartDrag(tab.id);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const sourceTabId = event.dataTransfer.getData("application/x-note-tab-id");

    if (sourceTabId && sourceTabId !== tab.id) {
      onDragTargetChange(tab.id);
      onReorder(sourceTabId, tab.id);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourceTabId = event.dataTransfer.getData("application/x-note-tab-id");

    if (sourceTabId && sourceTabId !== tab.id) {
      onReorder(sourceTabId, tab.id);
    }
  }

  return (
    <div
      aria-selected={isActive}
      className={cn(
        "electrobun-webkit-app-region-no-drag flex h-6 max-w-[180px] shrink-0 cursor-grab select-none items-center gap-1 rounded-md px-2 text-left text-xs transition-[background-color,color,box-shadow,opacity,transform] active:cursor-grabbing",
        isActive
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isDragged && "scale-95 opacity-45",
        isDropTarget && "bg-sidebar-accent shadow-[inset_2px_0_0_var(--foreground)]"
      )}
      draggable
      onClick={() => onSelect(tab.id)}
      onDragEnd={onDragEnd}
      onDragLeave={() => onDragTargetChange(null)}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(tab.id);
        }
      }}
      role="tab"
      tabIndex={0}
    >
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{tab.title}</span>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border/70" />
      <Button
        aria-label={`${tab.title} 탭 닫기`}
        className="h-5 w-5 shrink-0 rounded-sm"
        onClick={(event) => onClose(event, tab.id)}
        size="icon-xs"
        variant="ghost"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
