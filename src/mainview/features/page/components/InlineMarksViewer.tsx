import { cn } from "@/mainview/lib/utils";
import type { BlockProps } from "@/shared/contracts";
import { getInlineTextSegments } from "@/mainview/features/page/lib/inlineFormatting";

type InlineMarksViewerProps = {
  className?: string;
  onOpenPageLink?: (pageId: string) => void;
  props: BlockProps;
  text: string;
};

export function InlineMarksViewer({
  className,
  onOpenPageLink,
  props,
  text
}: InlineMarksViewerProps) {
  const segments = getInlineTextSegments(text, props);
  let segmentOffset = 0;

  if (segments.length === 1 && !isRenderableInlineSegment(segments[0])) {
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
      {segments.map((segment) => {
        const segmentStart = segmentOffset;
        segmentOffset += segment.text.length;

        return (
          <InlineSegment
            href={segment.href}
            key={`${segmentStart}-${segmentOffset}-${segment.text}`}
            marks={segment.marks}
            onOpenPageLink={onOpenPageLink}
            pageId={segment.pageId}
            text={segment.text}
          />
        );
      })}
    </div>
  );
}

function isRenderableInlineSegment(segment: ReturnType<typeof getInlineTextSegments>[number]) {
  return segment.marks.length > 0 || Boolean(segment.href) || Boolean(segment.pageId);
}

function InlineSegment({
  href,
  marks,
  onOpenPageLink,
  pageId,
  text
}: {
  href?: string;
  marks: Array<"bold" | "italic" | "code">;
  onOpenPageLink?: (pageId: string) => void;
  pageId?: string;
  text: string;
}) {
  const className = cn(
    marks.includes("bold") && "font-semibold",
    marks.includes("italic") && "italic",
    marks.includes("code") &&
      "rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.92em]"
  );

  if (pageId) {
    return (
      <button
        className={cn(
          className,
          "pointer-events-auto cursor-pointer rounded-sm bg-muted/80 px-0.5 text-left font-medium text-primary"
        )}
        data-page-link-id={pageId}
        onClick={() => onOpenPageLink?.(pageId)}
        onMouseDown={(event) => event.preventDefault()}
        type="button"
      >
        {text}
      </button>
    );
  }

  if (href) {
    return (
      <a
        className={cn(className, "text-primary underline underline-offset-2")}
        href={href}
      >
        {text}
      </a>
    );
  }

  return className ? <span className={className}>{text}</span> : <span>{text}</span>;
}
