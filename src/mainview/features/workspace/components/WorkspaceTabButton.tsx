import { FileText, X } from "lucide-react";
import type { MouseEvent, PointerEvent } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";
import { getPageTitleDisplay } from "@/shared/pageDisplay";
import type { TabDropPlacement } from "@/mainview/features/workspace/lib/tabDrag";

type WorkspaceTabButtonProps = {
  draggedTabId: string | null;
  dropPlacement: TabDropPlacement | null;
  isActive: boolean;
  isDragged: boolean;
  onClose: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onPressDrag: (tab: WorkspaceTab, point: { x: number; y: number }) => void;
  onSelect: (tabId: string) => void;
  tab: WorkspaceTab;
};

export function WorkspaceTabButton({
  draggedTabId,
  dropPlacement,
  isActive,
  isDragged,
  onClose,
  onPressDrag,
  onSelect,
  tab
}: WorkspaceTabButtonProps) {
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.focus();
    onPressDrag(tab, { x: event.clientX, y: event.clientY });
  }

  return (
    <div
      aria-selected={isActive}
      className={cn(
        "electrobun-webkit-app-region-no-drag relative flex h-6 max-w-[180px] shrink-0 cursor-grab select-none items-center gap-1 rounded-md px-2 text-left text-xs transition-[background-color,color,box-shadow,opacity,transform] active:cursor-grabbing",
        isActive
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isDragged && "scale-95 opacity-45",
        draggedTabId && !isDragged && "cursor-grabbing"
      )}
      data-workspace-tab-id={tab.id}
      onClick={() => onSelect(tab.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(tab.id);
        }
      }}
      onPointerDown={handlePointerDown}
      role="tab"
      tabIndex={0}
    >
      <TabDropIndicator placement={dropPlacement} />
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{getPageTitleDisplay(tab.title)}</span>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border/70" />
      <Button
        aria-label={`${getPageTitleDisplay(tab.title)} 탭 닫기`}
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

function TabDropIndicator({
  placement
}: {
  placement: TabDropPlacement | null;
}) {
  if (!placement) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-1 top-1 w-0.5 rounded-full bg-blue-500"
      style={{ left: placement === "before" ? -3 : "calc(100% + 3px)" }}
    />
  );
}
