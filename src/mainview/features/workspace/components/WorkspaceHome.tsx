import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/mainview/components/ui/button";
import type { Page } from "@/shared/contracts";
import { getPageTitleDisplay } from "@/shared/pageDisplay";
import { getRecentPages } from "../lib/recentPages";

type WorkspaceHomeProps = {
  isCreatingPage: boolean;
  onCreateUntitledPage: () => void;
  onOpenQuickSwitcher: () => void;
  onSelectPage: (page: Page) => void;
  pages: Page[];
};

const RECENT_PAGE_LIMIT = 8;

export function WorkspaceHome({
  isCreatingPage,
  onCreateUntitledPage,
  onOpenQuickSwitcher,
  onSelectPage,
  pages
}: WorkspaceHomeProps) {
  const recentPages = getRecentPages(pages, RECENT_PAGE_LIMIT);

  return (
    <div className="flex h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col px-10 pb-16 pt-20">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Home</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {pages.length} {pages.length === 1 ? "page" : "pages"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={onOpenQuickSwitcher} size="sm" variant="outline">
              <Search className="size-4" />
              Search
            </Button>
            <Button
              disabled={isCreatingPage}
              onClick={onCreateUntitledPage}
              size="sm"
            >
              <Plus className="size-4" />
              New
            </Button>
          </div>
        </div>

        <section>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
            Recent
          </div>
          {recentPages.length > 0 ? (
            <div className="divide-y divide-border/70 border-y border-border/70">
              {recentPages.map((page) => (
                <button
                  className="flex h-11 w-full items-center gap-3 px-1 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  key={page.id}
                  onClick={() => onSelectPage(page)}
                  type="button"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    {getPageTitleDisplay(page.title)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center border-y border-border/70 text-sm text-muted-foreground">
              No pages yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
