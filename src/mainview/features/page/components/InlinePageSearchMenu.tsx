import { useEffect, useRef, useState } from "react";
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
  const [results, setResults] = useState<{ pageId: string; title: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  void onClose;

  useEffect(() => {
    setSelectedIndex(0);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    if (debounceRef.current != null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const pages = await noteApi.searchPages({ query, limit: 8 });
        setResults(pages);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (results.length === 0) return;
    if (selectedIndex >= results.length) {
      setSelectedIndex(results.length - 1);
    }
  }, [results.length, selectedIndex]);

  if (!rect) return null;

  const left = Math.max(12, rect.left + rect.width / 2);
  const top = rect.bottom + 8;

  return (
    <div
      className={cn(
        "fixed z-30 -translate-x-1/2 rounded-md border border-border/80",
        "bg-popover/95 text-popover-foreground backdrop-blur-sm"
      )}
      role="listbox"
      style={{ left, top }}
    >
      {isLoading && results.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
      ) : results.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">No pages found</div>
      ) : (
        <ul className="max-h-48 overflow-y-auto py-1">
          {results.map((page, index) => (
            <li key={page.pageId}>
              <button
                className={cn(
                  "w-full px-3 py-1.5 text-left text-sm",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => onSelect(page.pageId, page.title)}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                {page.title || "Untitled"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
