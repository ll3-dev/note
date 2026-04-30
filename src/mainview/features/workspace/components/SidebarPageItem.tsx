import { ChevronRight, FileText } from "lucide-react";
import type { DragEvent } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import type { Page } from "@/shared/contracts";

export const PAGE_DRAG_TYPE = "application/x-note-page-id";

type SidebarPageItemProps = {
  activePageId: string | null;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
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

  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(PAGE_DRAG_TYPE, page.id);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const sourcePage = getDraggedPage(event);

    if (sourcePage) {
      onMovePage(sourcePage, page.parentPageId, previousSiblingId);
    }
  }

  function handleDropAsChild(event: DragEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const sourcePage = getDraggedPage(event);

    if (sourcePage) {
      onMovePage(sourcePage, page.id, null);
      onToggleExpanded(page.id);
    }
  }

  return (
    <Button
      className="group/page relative h-7 w-full min-w-0 select-none justify-start px-1 text-left font-normal"
      draggable
      onClick={() => onSelectPage(page)}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      style={{ paddingLeft: depth * 14 + 4 }}
      variant={page.id === activePageId ? "secondary" : "ghost"}
    >
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <FileText
          className={cn(
            "size-4 text-muted-foreground transition-opacity duration-150",
            hasChildren && "group-hover/page:opacity-0",
            hasChildren && isExpanded && "opacity-0"
          )}
        />
        <span
          aria-label={isExpanded ? "페이지 접기" : "페이지 펼치기"}
          className={cn(
            "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150",
            hasChildren && "group-hover/page:opacity-100",
            hasChildren && isExpanded && "opacity-100"
          )}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpanded(page.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={handleDropAsChild}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            onToggleExpanded(page.id);
          }}
          role="button"
          tabIndex={-1}
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-150",
              isExpanded && "rotate-90"
            )}
          />
        </span>
      </span>
      <span className="min-w-0 truncate">{page.title}</span>
    </Button>
  );
}
