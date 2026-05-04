import { cn } from "@/mainview/lib/utils";
import { buildHighlightSegments } from "@/mainview/features/page/lib/searchHighlightSegments";
import type { SearchHighlight } from "@/mainview/features/page/types/blockEditorTypes";

type SearchHighlightOverlayProps = {
  activeHighlight?: SearchHighlight;
  highlights: SearchHighlight[];
  text: string;
};

export function SearchHighlightOverlay({
  activeHighlight,
  highlights,
  text
}: SearchHighlightOverlayProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 whitespace-pre-wrap wrap-break-word px-1 py-1"
    >
      {buildHighlightSegments(text, highlights, activeHighlight).map((segment) => (
        <span
          className={cn(
            segment.isActive && "bg-orange-300/60 rounded-sm",
            segment.isHighlight && "bg-yellow-200/60 rounded-sm"
          )}
          key={segment.key}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}
