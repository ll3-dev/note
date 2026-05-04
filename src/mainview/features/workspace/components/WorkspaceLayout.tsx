import { type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Page } from "@/shared/contracts";
import { cn } from "@/mainview/lib/utils";
import { useSidebarResize } from "@/mainview/features/workspace/hooks/useSidebarResize";
import type { TextSyncStatus } from "@/mainview/features/workspace/hooks/useBlockTextSync";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceSettingsPanel } from "./WorkspaceSettingsPanel";
import {
  WorkspaceTitleBar,
  type WorkspaceHistoryNavigation
} from "./WorkspaceTitleBar";

type WorkspaceLayoutProps = {
  activePageId: string | null;
  archivedPages: Page[];
  blocksCount: number;
  children: ReactNode;
  historyNavigation: WorkspaceHistoryNavigation;
  isCreatingPage: boolean;
  isSettingsOpen: boolean;
  onCloseTab: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onCopyCurrentPageMarkdown: () => void;
  onCreatePage: (event: SyntheticEvent<HTMLFormElement>) => void;
  onCreateUntitledPage: () => void;
  onDeletePage: (page: Page) => void;
  onCloseSettings: () => void;
  onMovePage: (
    page: Page,
    parentPageId: string | null,
    afterPageId: string | null
  ) => void;
  onOpenSettings: () => void;
  onRefreshWorkspace: () => void;
  onRestoreArchivedPage: (page: Page) => void;
  onSelectPage: (page: Page) => void;
  onSelectTab: (tabId: string) => void;
  pages: Page[];
  pagesCount: number;
  saveStatus: TextSyncStatus;
  sqliteVersion?: string;
};

export function WorkspaceLayout({
  activePageId,
  archivedPages,
  blocksCount,
  children,
  historyNavigation,
  isCreatingPage,
  isSettingsOpen,
  onCloseSettings,
  onCloseTab,
  onCopyCurrentPageMarkdown,
  onCreatePage,
  onCreateUntitledPage,
  onDeletePage,
  onMovePage,
  onOpenSettings,
  onRefreshWorkspace,
  onRestoreArchivedPage,
  onSelectPage,
  onSelectTab,
  pages,
  pagesCount,
  saveStatus,
  sqliteVersion
}: WorkspaceLayoutProps) {
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const isSidebarCollapsed = useWorkspaceStore(
    (state) => state.isSidebarCollapsed
  );
  const reorderTabs = useWorkspaceStore((state) => state.reorderTabs);
  const setSidebarWidth = useWorkspaceStore((state) => state.setSidebarWidth);
  const sidebarWidth = useWorkspaceStore((state) => state.sidebarWidth);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const { handleResizeSidebar, isResizingSidebar } = useSidebarResize({
    setSidebarWidth,
    sidebarWidth
  });

  return (
    <main className="relative h-screen min-h-[640px] bg-background text-foreground">
      <WorkspaceTitleBar
        activeTabId={activeTabId}
        historyNavigation={historyNavigation}
        isCreatingPage={isCreatingPage}
        isSidebarCollapsed={isSidebarCollapsed}
        onCloseTab={onCloseTab}
        onCopyCurrentPageMarkdown={onCopyCurrentPageMarkdown}
        onCreateUntitledPage={onCreateUntitledPage}
        onSelectTab={onSelectTab}
        onToggleSidebar={toggleSidebar}
        onReorderTab={reorderTabs}
        sidebarOffset={isSidebarCollapsed ? 0 : sidebarWidth}
        tabs={tabs}
      />

      <div className="relative h-full min-h-0 overflow-hidden">
        <div
          aria-hidden={isSidebarCollapsed}
          className="absolute bottom-0 left-0 top-0 z-0 overflow-hidden bg-sidebar"
          inert={isSidebarCollapsed ? true : undefined}
          style={{ width: sidebarWidth }}
        >
          <aside
            className={cn(
              "relative flex h-full flex-col border-r border-border bg-sidebar",
              !isResizingSidebar &&
                "transition-transform duration-200 ease-out"
            )}
            style={{
              transform: isSidebarCollapsed ? "scale(0.992)" : "scale(1)",
              transformOrigin: "left center",
              width: sidebarWidth
            }}
          >
            <div
              className={cn(
                "h-full",
                !isResizingSidebar &&
                  "transition-[opacity,transform] duration-300 ease-out",
                !isSidebarCollapsed && "delay-75"
              )}
              style={{
                opacity: isSidebarCollapsed ? 0 : 1,
                transform: isSidebarCollapsed
                  ? "translate3d(-14px, 0, 0)"
                  : "translate3d(0, 0, 0)"
              }}
            >
              <WorkspaceSidebar
                activePageId={activePageId}
                isCreatingPage={isCreatingPage}
                onCreatePage={onCreatePage}
                onDeletePage={onDeletePage}
                onMovePage={onMovePage}
                onOpenSettings={onOpenSettings}
                onRefreshWorkspace={onRefreshWorkspace}
                onResizeSidebar={handleResizeSidebar}
                onSelectPage={onSelectPage}
                pages={pages}
              />
            </div>
          </aside>
        </div>

        <section
          className={cn(
            "workspace-content absolute bottom-0 left-0 top-0 z-10 min-w-0 bg-background pt-8",
            isResizingSidebar
              ? "transition-[padding-top] duration-150"
              : "transition-[transform,width,padding-top,box-shadow] duration-200 ease-out",
            isSidebarCollapsed && "shadow-[-18px_0_36px_-30px_var(--foreground)]"
          )}
          style={{
            transform: `translate3d(${isSidebarCollapsed ? 0 : sidebarWidth}px, 0, 0)`,
            width: isSidebarCollapsed ? "100%" : `calc(100% - ${sidebarWidth}px)`
          }}
        >
          {children}
        </section>
      </div>

      {isSettingsOpen ? (
        <WorkspaceSettingsPanel
          archivedPages={archivedPages}
          blocksCount={blocksCount}
          onClose={onCloseSettings}
          onCopyCurrentPageMarkdown={onCopyCurrentPageMarkdown}
          onRestoreArchivedPage={onRestoreArchivedPage}
          pagesCount={pagesCount}
          saveStatus={saveStatus}
          sqliteVersion={sqliteVersion}
        />
      ) : null}
    </main>
  );
}
