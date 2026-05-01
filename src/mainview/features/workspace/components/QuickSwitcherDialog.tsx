import type { SearchWorkspaceResult } from "@/shared/contracts";
import { getPageTitleDisplay } from "@/shared/pageDisplay";

type QuickSwitcherDialogProps = {
  activeIndex: number;
  isOpen: boolean;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelect: (result: SearchWorkspaceResult) => void;
  query: string;
  results: SearchWorkspaceResult[];
};

export function QuickSwitcherDialog({
  activeIndex,
  isOpen,
  onActiveIndexChange,
  onClose,
  onQueryChange,
  onSelect,
  query,
  results
}: QuickSwitcherDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-background/35" onMouseDown={onClose}>
      <div
        className="mx-auto mt-24 w-full max-w-xl rounded-md border border-border bg-popover p-2 text-popover-foreground"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          aria-label="Quick switcher"
          autoFocus
          className="h-9 w-full rounded-sm bg-background px-3 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onActiveIndexChange(Math.min(results.length - 1, activeIndex + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onActiveIndexChange(Math.max(0, activeIndex - 1));
            }
            if (event.key === "Enter" && results[activeIndex]) {
              event.preventDefault();
              onSelect(results[activeIndex]);
            }
          }}
          placeholder="Search pages and blocks"
          value={query}
        />
        <div className="mt-2 grid max-h-80 gap-0.5 overflow-y-auto">
          {results.map((result, index) => (
            <button
              className={`rounded-sm px-3 py-2 text-left text-sm ${
                index === activeIndex ? "bg-accent text-accent-foreground" : ""
              }`}
              key={`${result.kind}-${result.kind === "page" ? result.pageId : result.blockId}`}
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => onSelect(result)}
              type="button"
            >
              <div className="font-medium">
                {result.kind === "page"
                  ? getPageTitleDisplay(result.title)
                  : result.text || "Untitled block"}
              </div>
              <div className="text-xs text-muted-foreground">
                {result.kind === "page"
                  ? "Page"
                  : getPageTitleDisplay(result.pageTitle)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
