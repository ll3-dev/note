import { FileText, PanelLeft, Plus, X } from "lucide-react";
import type { MouseEvent, PointerEvent } from "react";
import { useEffect, useReducer } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";

type TabDragPreview = {
  id: string;
  title: string;
  x: number;
  y: number;
};

type TabDragState = {
  dropTargetTabId: string | null;
  preview: TabDragPreview | null;
};

type TabDragAction =
  | { point: { x: number; y: number }; tab: WorkspaceTab; type: "start" }
  | { point: { x: number; y: number }; type: "move" }
  | { tabId: string | null; type: "target" }
  | { type: "stop" };

const initialTabDragState: TabDragState = {
  dropTargetTabId: null,
  preview: null
};

function tabDragReducer(
  state: TabDragState,
  action: TabDragAction
): TabDragState {
  switch (action.type) {
    case "start":
      return {
        dropTargetTabId: null,
        preview: {
          id: action.tab.id,
          title: action.tab.title,
          x: action.point.x,
          y: action.point.y
        }
      };
    case "move":
      return state.preview
        ? {
            ...state,
            preview: {
              ...state.preview,
              x: action.point.x,
              y: action.point.y
            }
          }
        : state;
    case "target":
      return { ...state, dropTargetTabId: action.tabId };
    case "stop":
      return initialTabDragState;
  }
}

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
  const [tabDragState, dispatchTabDrag] = useReducer(
    tabDragReducer,
    initialTabDragState
  );
  const tabDragPreview = tabDragState.preview;
  const draggedTabId = tabDragPreview?.id ?? null;
  const dropTargetTabId = tabDragState.dropTargetTabId;

  useEffect(() => {
    if (!tabDragPreview) {
      return;
    }

    function stopTabDrag() {
      dispatchTabDrag({ type: "stop" });
    }

    function preventPointerSelection(event: globalThis.PointerEvent) {
      event.preventDefault();
      dispatchTabDrag({
        point: { x: event.clientX, y: event.clientY },
        type: "move"
      });
    }

    function preventTextSelection(event: Event) {
      event.preventDefault();
    }

    document.body.dataset.tabDragging = "true";
    window.getSelection()?.removeAllRanges();
    window.addEventListener("pointermove", preventPointerSelection, {
      passive: false
    });
    window.addEventListener("pointerup", stopTabDrag);
    window.addEventListener("pointercancel", stopTabDrag);
    document.addEventListener("selectstart", preventTextSelection);

    return () => {
      delete document.body.dataset.tabDragging;
      window.removeEventListener("pointermove", preventPointerSelection);
      window.removeEventListener("pointerup", stopTabDrag);
      window.removeEventListener("pointercancel", stopTabDrag);
      document.removeEventListener("selectstart", preventTextSelection);
    };
  }, [draggedTabId]);

  function startTabDrag(
    tab: WorkspaceTab,
    point: { x: number; y: number }
  ) {
    dispatchTabDrag({ point, tab, type: "start" });
  }

  function stopTabDrag() {
    dispatchTabDrag({ type: "stop" });
  }

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
              isActive={tab.id === activeTabId}
              isDragged={draggedTabId === tab.id}
              isDropTarget={
                dropTargetTabId === tab.id && draggedTabId !== tab.id
              }
              key={tab.id}
              onClose={onCloseTab}
              draggingTabId={draggedTabId}
              onDragEnd={stopTabDrag}
              onDragTargetChange={(tabId) =>
                dispatchTabDrag({ tabId, type: "target" })
              }
              onReorder={onReorderTab}
              onSelect={onSelectTab}
              onStartDrag={startTabDrag}
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

      {tabDragPreview ? <TabDragGhost preview={tabDragPreview} /> : null}
    </>
  );
}

function TabDragGhost({ preview }: { preview: TabDragPreview }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50 flex h-7 max-w-[190px] items-center gap-1 rounded-md border border-border bg-background/95 px-2 text-xs font-medium text-foreground shadow-md"
      style={{
        left: preview.x,
        top: preview.y,
        transform: "translate(8px, -50%)"
      }}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{preview.title}</span>
    </div>
  );
}

function WorkspaceTabButton({
  draggingTabId,
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
  draggingTabId: string | null;
  isActive: boolean;
  isDragged: boolean;
  isDropTarget: boolean;
  onClose: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onDragEnd: () => void;
  onDragTargetChange: (tabId: string | null) => void;
  onReorder: (sourceTabId: string, targetTabId: string) => void;
  onSelect: (tabId: string) => void;
  onStartDrag: (tab: WorkspaceTab, point: { x: number; y: number }) => void;
  tab: WorkspaceTab;
}) {
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    onStartDrag(tab, { x: event.clientX, y: event.clientY });
  }

  function handlePointerEnter() {
    if (draggingTabId && draggingTabId !== tab.id) {
      onDragTargetChange(tab.id);
      onReorder(draggingTabId, tab.id);
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
      onClick={() => onSelect(tab.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(tab.id);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerUp={onDragEnd}
      role="tab"
      tabIndex={0}
    >
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{tab.title}</span>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border/70" />
      <Button
        aria-label={`${tab.title} 탭 닫기`}
        className="electrobun-webkit-app-region-no-drag h-5 w-5 shrink-0 rounded-sm"
        onClick={(event) => onClose(event, tab.id)}
        onPointerDown={(event) => event.stopPropagation()}
        size="icon-xs"
        variant="ghost"
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
