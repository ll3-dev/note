import type { KeyboardEvent } from "react";
import { FileText, RotateCcw } from "lucide-react";
import { cn } from "@/mainview/lib/utils";
import type { Block, Page } from "@/shared/contracts";
import { getPageTitleDisplay } from "@/shared/pageDisplay";
import type { OpenPageLinkOptions } from "@/mainview/features/page/types/blockEditorTypes";

type PageLinkBlockProps = {
  blockId: string;
  draft: string;
  draftProps: Block["props"];
  linkedPage: Page | null;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onOpenPageLink: (pageId: string, options?: OpenPageLinkOptions) => void;
  onRestorePageLink: (pageId: string) => void;
};

export function PageLinkBlock({
  blockId,
  draft,
  draftProps,
  linkedPage,
  onKeyDown,
  onOpenPageLink,
  onRestorePageLink
}: PageLinkBlockProps) {
  const linkedPageId = getStringProp(draftProps.targetPageId);
  const title = getPageTitleDisplay(
    linkedPage?.title ?? getStringProp(draftProps.targetTitle) ?? draft
  );
  const isArchived = Boolean(linkedPage?.archivedAt);

  return (
    <div className="flex min-h-8 min-w-0 flex-1 items-center gap-1">
      <button
        className={cn(
          "min-w-0 flex-1 rounded-sm px-1.5 py-1 text-left outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring",
          isArchived && "text-muted-foreground"
        )}
        data-block-focus-target
        data-block-focus-target-id={blockId}
        onAuxClick={(event) => {
          if (event.button !== 1 || !linkedPageId || isArchived) {
            return;
          }

          event.preventDefault();
          onOpenPageLink(linkedPageId, { newTab: true });
        }}
        onClick={() => {
          if (!linkedPageId) {
            return;
          }

          if (isArchived) {
            onRestorePageLink(linkedPageId);
            return;
          }

          onOpenPageLink(linkedPageId);
        }}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => {
          if (event.button === 1) {
            event.preventDefault();
          }
        }}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-[15px] font-semibold text-foreground">
            {title}
          </span>
          {isArchived ? (
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              Archived
            </span>
          ) : null}
        </span>
      </button>
      {isArchived && linkedPageId ? (
        <button
          aria-label={`${title} 페이지 복구`}
          className="flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => onRestorePageLink(linkedPageId)}
          type="button"
        >
          <RotateCcw className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function getStringProp(value: unknown) {
  return typeof value === "string" ? value : null;
}
