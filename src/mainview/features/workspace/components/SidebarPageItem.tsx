import { ChevronRight, FileText, Trash2 } from "lucide-react";
import type { DragEvent } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import type { Page } from "@/shared/contracts";
import { getPageTitleDisplay } from "@/shared/pageDisplay";

export const PAGE_DRAG_TYPE = "application/x-note-page-id";

type SidebarPageItemProps = {
  activePageId: string | null;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onDeletePage: (page: Page) => void;
  onMovePage: (
    page: Page,
    parentPageId: string | null,
    afterPageId: string | null
  ) => void;
  onSelectPage: (page: Page) => void;
  onToggleExpanded: (pageId: string) => void;
  page: Page;
  pagesById: Map<string, Page>;
  previousSiblingId: string | null;
};

export function SidebarPageItem({
  activePageId,
  depth,
  hasChildren,
  isExpanded,
  onDeletePage,
  onMovePage,
  onSelectPage,
  onToggleExpanded,
  page,
  pagesById,
  previousSiblingId
}: SidebarPageItemProps) {
  function getDraggedPage(event: DragEvent<HTMLElement>) {
    const sourcePageId = event.dataTransfer.getData(PAGE_DRAG_TYPE);
    return sourcePageId === page.id ? null : pagesById.get(sourcePageId);
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(PAGE_DRAG_TYPE, page.id);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourcePage = getDraggedPage(event);

    if (sourcePage) {
      onMovePage(sourcePage, page.parentPageId, previousSiblingId);
    }
  }

  function handleDropAsChild(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const sourcePage = getDraggedPage(event);

    if (sourcePage) {
      onMovePage(sourcePage, page.id, null);
      onToggleExpanded(page.id);
    }
  }

  return (
    <div
      className={cn(
        "group/page grid h-7 w-full min-w-0 select-none grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-center gap-1 rounded-md pr-1 text-sm transition-colors",
        page.id === activePageId
          ? "bg-secondary text-secondary-foreground"
          : "hover:bg-accent hover:text-accent-foreground"
      )}
      draggable
      onDragOver={(event) => event.preventDefault()}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      style={{ paddingLeft: depth * 14 + 4 }}
    >
      {hasChildren ? (
        <Button
          aria-label={isExpanded ? "페이지 접기" : "페이지 펼치기"}
          className="size-5 rounded-sm text-muted-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpanded(page.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={handleDropAsChild}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-150",
              isExpanded && "rotate-90"
            )}
          />
        </Button>
      ) : (
        <span className="flex size-5 items-center justify-center text-muted-foreground">
          <FileText className="size-4" />
        </span>
      )}
      <button
        className="min-w-0 truncate text-left outline-none focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50"
        onClick={() => onSelectPage(page)}
        type="button"
      >
        {getPageTitleDisplay(page.title)}
      </button>
      <Button
        aria-label={`${getPageTitleDisplay(page.title)} 페이지 삭제`}
        className="size-5 rounded-sm opacity-0 transition-opacity group-hover/page:opacity-100 group-focus-within/page:opacity-100 focus-visible:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          onDeletePage(page);
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
