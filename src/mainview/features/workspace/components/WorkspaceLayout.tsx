import { FileText, PanelLeft, Plus, RefreshCw } from "lucide-react";
import type { FormEvent, MouseEvent, ReactNode } from "react";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { cn } from "@/mainview/lib/utils";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Page } from "../../../../shared/contracts";
import { StatusFooter } from "./StatusFooter";
import { WorkspaceTitleBar } from "./WorkspaceTitleBar";

type WorkspaceLayoutProps = {
  activePageId: string | null;
  blocksCount: number;
  children: ReactNode;
  isCreatingPage: boolean;
  onCloseTab: (event: MouseEvent<HTMLButtonElement>, tabId: string) => void;
  onCreatePage: (event: FormEvent<HTMLFormElement>) => void;
  onCreateUntitledPage: () => void;
  onRefreshWorkspace: () => void;
  onSelectPage: (page: Page) => void;
  onSelectTab: (tabId: string) => void;
  pages: Page[];
  pagesCount: number;
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
  onRefreshWorkspace,
  onSelectPage,
  onSelectTab,
  pages,
  pagesCount,
  sqliteVersion
}: WorkspaceLayoutProps) {
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const isSidebarCollapsed = useWorkspaceStore(
    (state) => state.isSidebarCollapsed
  );
  const pageTitleDraft = useWorkspaceStore((state) => state.pageTitleDraft);
  const setPageTitleDraft = useWorkspaceStore(
    (state) => state.setPageTitleDraft
  );
  const tabs = useWorkspaceStore((state) => state.tabs);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);

  return (
    <main className="flex h-screen min-h-[640px] flex-col bg-background text-foreground">
      <WorkspaceTitleBar
        activeTabId={activeTabId}
        isCreatingPage={isCreatingPage}
        isSidebarCollapsed={isSidebarCollapsed}
        onCloseTab={onCloseTab}
        onCreateUntitledPage={onCreateUntitledPage}
        onSelectTab={onSelectTab}
        onToggleSidebar={toggleSidebar}
        tabs={tabs}
      />

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-border bg-sidebar transition-[width]",
            isSidebarCollapsed ? "w-12" : "w-[272px]"
          )}
        >
          {!isSidebarCollapsed ? (
            <header className="flex h-9 items-center justify-between px-2.5">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md border border-border bg-background">
                  <PanelLeft className="size-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm font-semibold">Note</span>
              </div>
              <Button
                aria-label="새로고침"
                onClick={onRefreshWorkspace}
                size="icon-xs"
                variant="ghost"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </header>
          ) : null}

          {!isSidebarCollapsed ? (
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
                  {pages.length === 0 ? (
                    <p className="px-2 py-6 text-sm text-muted-foreground">
                      Create your first page.
                    </p>
                  ) : null}
                  {pages.map((page) => (
                    <Button
                      className="h-7 justify-start px-2 text-left font-normal"
                      key={page.id}
                      onClick={() => onSelectPage(page)}
                      variant={page.id === activePageId ? "secondary" : "ghost"}
                    >
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="truncate">{page.title}</span>
                    </Button>
                  ))}
                </nav>
              </ScrollArea>

              <StatusFooter
                blocksCount={blocksCount}
                pagesCount={pagesCount}
                sqliteVersion={sqliteVersion}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-1.5 px-1.5 py-1.5">
              <Button
                aria-label="새로고침"
                onClick={onRefreshWorkspace}
                size="icon-xs"
                variant="ghost"
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Separator />
              {pages.slice(0, 8).map((page) => (
                <Button
                  aria-label={page.title}
                  key={page.id}
                  onClick={() => onSelectPage(page)}
                  size="icon-xs"
                  variant={page.id === activePageId ? "secondary" : "ghost"}
                >
                  <FileText className="size-3.5" />
                </Button>
              ))}
            </div>
          )}
        </aside>

        <section className="min-w-0 flex-1 bg-background">{children}</section>
      </div>
    </main>
  );
}
