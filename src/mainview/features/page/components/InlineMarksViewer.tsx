import { cn } from "@/mainview/lib/utils";
import type { BlockProps } from "../../../../shared/contracts";
import { getInlineTextSegments } from "../lib/inlineFormatting";

type InlineMarksViewerProps = {
  className?: string;
  props: BlockProps;
  text: string;
};

export function InlineMarksViewer({
  className,
  props,
  text
}: InlineMarksViewerProps) {
  const segments = getInlineTextSegments(text, props);

  if (segments.length === 1 && segments[0]?.marks.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 whitespace-pre-wrap wrap-break-word px-1 py-1",
        className
      )}
    >
      {segments.map((segment, index) => (
        <InlineSegment
          key={`${index}-${segment.text}`}
          marks={segment.marks}
          text={segment.text}
        />
      ))}
    </div>
  );
}

function InlineSegment({
  marks,
  text
}: {
  marks: Array<"bold" | "italic" | "code">;
  text: string;
}) {
  const className = cn(
    marks.includes("bold") && "font-semibold",
    marks.includes("italic") && "italic",
    marks.includes("code") &&
      "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.92em]"
  );

  return className ? <span className={className}>{text}</span> : <span>{text}</span>;
}
