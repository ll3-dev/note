import { PanelLeft, Plus, RefreshCw, Settings } from "lucide-react";
import {
  useState,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent
} from "react";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Page } from "../../../../shared/contracts";
import { useSidebarResize } from "../hooks/useSidebarResize";
import type { TextSyncStatus } from "../hooks/useBlockTextSync";
import { SidebarPageTree } from "./SidebarPageTree";
import { WorkspaceSettingsPanel } from "./WorkspaceSettingsPanel";
import { WorkspaceTitleBar } from "./WorkspaceTitleBar";

type WorkspaceLayoutProps = {
  activePageId: string | null;
  blocksCount: number;
  children: ReactNode;
  isCreatingPage: boolean;
  onCloseTab: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onCreatePage: (event: SyntheticEvent<HTMLFormElement>) => void;
  onCreateUntitledPage: () => void;
  onMovePage: (
    page: Page,
    parentPageId: string | null,
    afterPageId: string | null
  ) => void;
  onRefreshWorkspace: () => void;
  onSelectPage: (page: Page) => void;
  onSelectTab: (tabId: string) => void;
  pages: Page[];
  pagesCount: number;
  saveStatus: TextSyncStatus;
  sqliteVersion?: string;
};

export function WorkspaceLayout({
  activePageId,
  blocksCount,
  children,
  isCreatingPage,
  onCloseTab,
  onCreatePage,
  onCreateUntitledPage,
  onMovePage,
  onRefreshWorkspace,
  onSelectPage,
  onSelectTab,
  pages,
  pagesCount,
  saveStatus,
  sqliteVersion
}: WorkspaceLayoutProps) {
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const expandedPageIds = useWorkspaceStore((state) => state.expandedPageIds);
  const isSidebarCollapsed = useWorkspaceStore(
    (state) => state.isSidebarCollapsed
  );
  const pageTitleDraft = useWorkspaceStore((state) => state.pageTitleDraft);
  const reorderTabs = useWorkspaceStore((state) => state.reorderTabs);
  const setPageTitleDraft = useWorkspaceStore(
    (state) => state.setPageTitleDraft
  );
  const setSidebarWidth = useWorkspaceStore((state) => state.setSidebarWidth);
  const sidebarWidth = useWorkspaceStore((state) => state.sidebarWidth);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const toggleExpandedPage = useWorkspaceStore(
    (state) => state.toggleExpandedPage
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { handleResizeSidebar, isResizingSidebar } = useSidebarResize({
    setSidebarWidth,
    sidebarWidth
  });

  return (
    <main className="relative h-screen min-h-[640px] bg-background text-foreground">
      <WorkspaceTitleBar
        activeTabId={activeTabId}
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
            <header className="flex h-10 items-center justify-between pl-[88px] pr-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold leading-none">Note</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  aria-label="새로고침"
                  onClick={onRefreshWorkspace}
                  size="icon-xs"
                  variant="ghost"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
                <Button
                  aria-label="설정"
                  onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
                  size="icon-xs"
                  variant="ghost"
                >
                  <Settings className="size-3.5" />
                </Button>
                <Button
                  aria-label="사이드바 닫기"
                  onClick={toggleSidebar}
                  size="icon-xs"
                  variant="ghost"
                >
                  <PanelLeft className="size-3.5" />
                </Button>
              </div>
            </header>

            <>
              <form className="px-2.5 pb-2" onSubmit={onCreatePage}>
                <div className="flex gap-2">
                  <Input
                    aria-label="새 페이지 제목"
                    className="h-7 bg-background text-sm"
                    onChange={(event) =>
                      setPageTitleDraft(event.target.value)
                    }
                    placeholder="New page"
                    value={pageTitleDraft}
                  />
                  <Button
                    disabled={isCreatingPage || !pageTitleDraft.trim()}
                    size="icon-sm"
                    type="submit"
                    variant="outline"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </form>

              <Separator />

              <ScrollArea className="min-h-0 flex-1">
                <nav className="grid gap-0.5 p-1.5">
                  <SidebarPageTree
                    activePageId={activePageId}
                    expandedPageIds={new Set(expandedPageIds)}
                    onMovePage={onMovePage}
                    onSelectPage={onSelectPage}
                    onToggleExpanded={toggleExpandedPage}
                    pages={pages}
                  />
                </nav>
              </ScrollArea>

              {isSettingsOpen ? (
                <WorkspaceSettingsPanel
                  blocksCount={blocksCount}
                  onClose={() => setIsSettingsOpen(false)}
                  pagesCount={pagesCount}
                  saveStatus={saveStatus}
                  sqliteVersion={sqliteVersion}
                />
              ) : null}
            </>
            <div
              aria-label="사이드바 너비 조절"
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-border"
              onPointerDown={handleResizeSidebar}
              role="separator"
            />
          </aside>
        </div>

        <section className="workspace-content relative min-w-0 flex-1 bg-background pt-8 transition-[padding-top] duration-150">
          {children}
        </section>
      </div>
    </main>
  );
}
