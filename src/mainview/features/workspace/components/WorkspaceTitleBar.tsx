import { FileText, PanelLeft, Plus, X } from "lucide-react";
import type { MouseEvent } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import type { WorkspaceTab } from "@/mainview/store/useWorkspaceStore";

type WorkspaceTitleBarProps = {
  activeTabId: string | null;
  isCreatingPage: boolean;
  isSidebarCollapsed: boolean;
  onCloseTab: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onCreateUntitledPage: () => void;
  onSelectTab: (tabId: string) => void;
  onToggleSidebar: () => void;
  tabs: WorkspaceTab[];
};

export function WorkspaceTitleBar({
  activeTabId,
  isCreatingPage,
  isSidebarCollapsed,
  onCloseTab,
  onCreateUntitledPage,
  onSelectTab,
  onToggleSidebar,
  tabs
}: WorkspaceTitleBarProps) {
  return (
    <header className="electrobun-webkit-app-region-drag flex h-8 shrink-0 items-center gap-1 border-b border-border bg-sidebar/95 pl-[72px] pr-1.5">
      <Button
        aria-label={isSidebarCollapsed ? "사이드바 열기" : "사이드바 닫기"}
        className="electrobun-webkit-app-region-no-drag"
        onClick={onToggleSidebar}
        size="icon-xs"
        variant="ghost"
      >
        <PanelLeft className="size-3.5" />
      </Button>

      <div
        className="electrobun-webkit-app-region-no-drag flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
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
            key={tab.id}
            onClose={onCloseTab}
            onSelect={onSelectTab}
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
  onClose,
  onSelect,
  tab
}: {
  isActive: boolean;
  onClose: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onSelect: (tabId: string) => void;
  tab: WorkspaceTab;
}) {
  return (
    <div
      aria-selected={isActive}
      className={cn(
        "flex h-6 max-w-[180px] shrink-0 items-center gap-1 rounded-md px-2 text-left text-xs transition-colors",
        isActive
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      onClick={() => onSelect(tab.id)}
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
