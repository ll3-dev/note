import type { BlockProps } from "@/shared/contracts";

export function getConnectedPageIdsFromProps(props: BlockProps) {
  const pageIds = new Set<string>();

  if (typeof props.targetPageId === "string" && props.targetPageId) {
    pageIds.add(props.targetPageId);
  }

  for (const mark of getInlinePageLinkMarks(props)) {
    pageIds.add(mark.pageId);
  }

  return [...pageIds];
}

function getInlinePageLinkMarks(props: BlockProps) {
  const marks = props.inlineMarks;

  if (!Array.isArray(marks)) {
    return [];
  }

  return marks.flatMap((mark) =>
    isInlinePageLinkMark(mark) ? [{ pageId: mark.pageId }] : []
  );
}

function isInlinePageLinkMark(value: unknown): value is { pageId: string } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "pageLink" &&
    typeof (value as { pageId?: unknown }).pageId === "string" &&
    (value as { pageId: string }).pageId.length > 0
  );
}
