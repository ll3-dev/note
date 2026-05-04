import { useEffect, useReducer, useRef } from "react";
import { FileText, Search } from "lucide-react";
import { noteApi } from "@/mainview/lib/rpc";
import { cn } from "@/mainview/lib/utils";

type InlinePageSearchMenuProps = {
  onClose: () => void;
  onSelect: (pageId: string, pageTitle: string) => void;
  query: string;
  rect: DOMRect | null;
};

export function InlinePageSearchMenu({
  onClose,
  onSelect,
  query,
  rect
}: InlinePageSearchMenuProps) {
  const [{ isLoading, results, selectedIndex }, dispatch] = useReducer(
    inlinePageSearchMenuReducer,
    {
      isLoading: false,
      results: [],
      selectedIndex: 0
    }
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dispatch({ type: "start" });
    if (debounceRef.current != null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const pages = query.trim()
          ? await noteApi.searchPages({ query, limit: 8 })
          : (await noteApi.listPages())
              .slice(0, 8)
              .map((page) => ({ pageId: page.id, title: page.title }));
        dispatch({ results: pages, type: "loaded" });
      } catch {
        dispatch({ type: "failed" });
      }
    }, 150);

    return () => {
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (results.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        dispatch({ type: "next" });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        dispatch({ type: "previous" });
        return;
      }

      if (event.key === "Enter") {
        const selectedPage = results[selectedIndex];

        if (selectedPage) {
          event.preventDefault();
          onSelect(selectedPage.pageId, selectedPage.title);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onClose, onSelect, results, selectedIndex]);

  if (!rect) return null;

  const left = Math.max(12, Math.min(rect.left, window.innerWidth - 332));
  const top = Math.min(rect.bottom + 8, window.innerHeight - 260);
  const hasQuery = query.trim().length > 0;

  return (
    <div
      className={cn(
        "fixed z-30 w-80 overflow-hidden rounded-md border border-border/80",
        "bg-popover text-popover-foreground shadow-lg"
      )}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      role="listbox"
      style={{ left, top }}
    >
      <div className="border-b border-border/70 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="size-3.5" />
          <span>{hasQuery ? `Search pages for "${query}"` : "Link to page"}</span>
        </div>
      </div>
      {isLoading && results.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
      ) : results.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {hasQuery ? "No matching pages" : "No pages yet"}
        </div>
      ) : (
        <ul className="max-h-56 overflow-y-auto p-1">
          {results.map((page, index) => (
            <li key={page.pageId}>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => onSelect(page.pageId, page.title)}
                onMouseDown={(event) => event.preventDefault()}
                aria-selected={index === selectedIndex}
                role="option"
                type="button"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                  <FileText className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-5">
                    {page.title || "Untitled"}
                  </span>
                  <span className="block truncate text-xs leading-4 text-muted-foreground">
                    Page
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type InlinePageSearchResult = {
  pageId: string;
  title: string;
};

type InlinePageSearchMenuState = {
  isLoading: boolean;
  results: InlinePageSearchResult[];
  selectedIndex: number;
};

type InlinePageSearchMenuAction =
  | { type: "failed" }
  | { results: InlinePageSearchResult[]; type: "loaded" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "start" };

function inlinePageSearchMenuReducer(
  state: InlinePageSearchMenuState,
  action: InlinePageSearchMenuAction
): InlinePageSearchMenuState {
  switch (action.type) {
    case "start":
      return { ...state, isLoading: true, selectedIndex: 0 };
    case "loaded":
      return {
        isLoading: false,
        results: action.results,
        selectedIndex: 0
      };
    case "failed":
      return { isLoading: false, results: [], selectedIndex: 0 };
    case "next":
      return state.results.length === 0
        ? state
        : {
            ...state,
            selectedIndex: (state.selectedIndex + 1) % state.results.length
          };
    case "previous":
      return state.results.length === 0
        ? state
        : {
            ...state,
            selectedIndex:
              (state.selectedIndex - 1 + state.results.length) %
              state.results.length
          };
    default:
      return state;
  }
}
