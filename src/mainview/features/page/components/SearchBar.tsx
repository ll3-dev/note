import { useEffect, useRef } from "react";

type SearchBarProps = {
  activeIndex: number;
  matchCount: number;
  query: string;
  replaceQuery: string;
  showReplace: boolean;
  onClose: () => void;
  onGoNext: () => void;
  onGoPrevious: () => void;
  onQueryChange: (query: string) => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onReplaceQueryChange: (query: string) => void;
  onToggleReplace: () => void;
};

export function SearchBar({
  activeIndex,
  matchCount,
  query,
  replaceQuery,
  showReplace,
  onClose,
  onGoNext,
  onGoPrevious,
  onQueryChange,
  onReplace,
  onReplaceAll,
  onReplaceQueryChange,
  onToggleReplace
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
      <button
        className="text-muted-foreground hover:text-foreground text-xs"
        onClick={onToggleReplace}
        type="button"
      >
        {showReplace ? "≪" : "≫"}
      </button>
      <input
        className="w-40 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus:border-primary"
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.shiftKey ? onGoPrevious() : onGoNext();
          }
          if (e.key === "Escape") {
            onClose();
          }
        }}
        placeholder="Find"
        ref={inputRef}
        value={query}
      />
      <span className="text-xs text-muted-foreground min-w-12 text-center">
        {matchCount > 0 ? `${activeIndex + 1}/${matchCount}` : "0/0"}
      </span>
      <button className="text-xs hover:text-foreground" onClick={onGoPrevious} type="button">
        ↑
      </button>
      <button className="text-xs hover:text-foreground" onClick={onGoNext} type="button">
        ↓
      </button>
      {showReplace ? (
        <>
          <input
            className="w-40 rounded-sm border bg-transparent px-2 py-1 text-sm outline-none focus:border-primary"
            onChange={(e) => onReplaceQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder="Replace"
            value={replaceQuery}
          />
          <button
            className="text-xs hover:text-foreground"
            onClick={onReplace}
            type="button"
          >
            Replace
          </button>
          <button
            className="text-xs hover:text-foreground"
            onClick={onReplaceAll}
            type="button"
          >
            All
          </button>
        </>
      ) : null}
      <button className="text-xs hover:text-foreground" onClick={onClose} type="button">
        ✕
      </button>
    </div>
  );
}
