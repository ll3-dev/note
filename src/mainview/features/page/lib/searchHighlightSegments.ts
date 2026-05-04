import type { SearchHighlight } from "@/mainview/features/page/types/blockEditorTypes";

export type HighlightSegment = {
  isActive: boolean;
  isHighlight: boolean;
  key: string;
  text: string;
};

export function buildHighlightSegments(
  text: string,
  highlights: SearchHighlight[],
  activeHighlight?: SearchHighlight
): HighlightSegment[] {
  const points = new Set<number>();

  points.add(0);
  points.add(text.length);

  for (const highlight of highlights) {
    points.add(highlight.offset);
    points.add(highlight.offset + highlight.length);
  }

  const sorted = Array.from(points).sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];

    if (start === end) continue;

    const isActive = containsHighlightRange(activeHighlight, start, end);

    segments.push({
      isActive,
      isHighlight:
        !isActive &&
        highlights.some((highlight) => containsHighlightRange(highlight, start, end)),
      key: `${start}-${end}`,
      text: text.slice(start, end)
    });
  }

  return segments;
}

function containsHighlightRange(
  highlight: SearchHighlight | undefined,
  start: number,
  end: number
) {
  return Boolean(
    highlight && highlight.offset <= start && highlight.offset + highlight.length >= end
  );
}
