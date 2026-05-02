import { PanelLeft, Plus, RefreshCw, Settings } from "lucide-react";
import { useState, type PointerEvent, type SyntheticEvent } from "react";
import { Button } from "@/mainview/components/ui/button";
import { Input } from "@/mainview/components/ui/input";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Separator } from "@/mainview/components/ui/separator";
import { useWorkspaceStore } from "@/mainview/store/useWorkspaceStore";
import type { Page } from "@/shared/contracts";
import type { TextSyncStatus } from "@/mainview/features/workspace/hooks/useBlockTextSync";
import { SidebarPageTree } from "./SidebarPageTree";
import { WorkspaceSettingsPanel } from "./WorkspaceSettingsPanel";

type WorkspaceSidebarProps = {
  activePageId: string | null;
  blocksCount: number;
  isCreatingPage: boolean;
  onCopyCurrentPageMarkdown: () => void;
  onCreatePage: (event: SyntheticEvent<HTMLFormElement>) => void;
  onDeletePage: (page: Page) => void;
  onMovePage: (
    page: Page,
    parentPageId: string | null,
    afterPageId: string | null
  ) => void;
  onRefreshWorkspace: () => void;
  onResizeSidebar: (event: PointerEvent<HTMLDivElement>) => void;
  onSelectPage: (page: Page) => void;
  pages: Page[];
  pagesCount: number;
  saveStatus: TextSyncStatus;
  sqliteVersion?: string;
};

export function WorkspaceSidebar({
  activePageId,
  blocksCount,
  isCreatingPage,
  onCopyCurrentPageMarkdown,
  onCreatePage,
  onDeletePage,
  onMovePage,
  onRefreshWorkspace,
  onResizeSidebar,
  onSelectPage,
  pages,
  pagesCount,
  saveStatus,
  sqliteVersion
}: WorkspaceSidebarProps) {
  const expandedPageIds = useWorkspaceStore((state) => state.expandedPageIds);
  const pageTitleDraft = useWorkspaceStore((state) => state.pageTitleDraft);
  const setPageTitleDraft = useWorkspaceStore(
    (state) => state.setPageTitleDraft
  );
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const toggleExpandedPage = useWorkspaceStore(
    (state) => state.toggleExpandedPage
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
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

      <form className="px-2.5 pb-2" onSubmit={onCreatePage}>
        <div className="flex gap-2">
          <Input
            aria-label="새 페이지 제목"
            className="h-7 bg-background text-sm"
            onChange={(event) => setPageTitleDraft(event.target.value)}
            placeholder="New page"
            value={pageTitleDraft}
          />
          <Button
            aria-label="새 페이지"
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
            onDeletePage={onDeletePage}
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
          onCopyCurrentPageMarkdown={onCopyCurrentPageMarkdown}
          pagesCount={pagesCount}
          saveStatus={saveStatus}
          sqliteVersion={sqliteVersion}
        />
      ) : null}

      <div
        aria-label="사이드바 너비 조절"
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-border"
        onPointerDown={onResizeSidebar}
        role="separator"
      />
    </>
  );
}
