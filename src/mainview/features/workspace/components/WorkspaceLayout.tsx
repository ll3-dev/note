import { type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Page } from "@/shared/contracts";
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
        onCreateUntitledPage={onCreateUntitledPage}
        onSelectTab={onSelectTab}
        onToggleSidebar={toggleSidebar}
        onReorderTab={reorderTabs}
        sidebarOffset={isSidebarCollapsed ? 0 : sidebarWidth}
        tabs={tabs}
      />

      <div className="flex h-full min-h-0">
        <div
          aria-hidden={isSidebarCollapsed}
          className={
            isResizingSidebar
              ? "shrink-0 overflow-hidden"
              : "shrink-0 overflow-hidden transition-[width] duration-150 ease-out"
          }
          inert={isSidebarCollapsed ? true : undefined}
          style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
        >
          <aside
            className={
              isResizingSidebar
                ? "relative flex h-full flex-col border-r border-border bg-sidebar"
                : "relative flex h-full flex-col border-r border-border bg-sidebar transition-transform duration-150 ease-out"
            }
            style={{
              transform: isSidebarCollapsed
                ? "translateX(-100%)"
                : "translateX(0)",
              width: sidebarWidth
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
          </aside>
        </div>

        <section className="workspace-content relative min-w-0 flex-1 bg-background pt-8 transition-[padding-top] duration-150">
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
