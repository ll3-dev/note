import type { BlockProps } from "@/shared/contracts";
import { normalizeLinkHref } from "@/shared/linkSanitization";

export type InlineMarkType = "bold" | "italic" | "code";
export type TextStyleInlineMarkType = InlineMarkType;
export type LinkInlineMarkType = "link";
export type AnyInlineMarkType = InlineMarkType | LinkInlineMarkType;

export type InlineMark = {
  end: number;
  href?: string;
  start: number;
  type: AnyInlineMarkType;
};

export type InlineTextSegment = {
  marks: InlineMarkType[];
  href?: string;
  text: string;
};

export function addInlineMarksToProps(
  props: BlockProps,
  types: InlineMarkType[],
  selection: { end: number; start: number }
) {
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);

  if (start === end || types.length === 0) {
    return props;
  }

  return {
    ...props,
    inlineMarks: [
      ...getInlineMarks(props),
      ...types.map((type) => ({ end, start, type }))
    ]
  };
}

export function getInlineFormatProps(
  commandId: string,
  props: BlockProps,
  selection?: { end: number; start: number } | null
) {
  const type = getInlineMarkType(commandId);

  if (!type || !selection) {
    return null;
  }

  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);

  if (start === end) {
    return null;
  }

  const marks = getInlineMarks(props);
  const exists = marks.some(
    (mark) => mark.type === type && mark.start === start && mark.end === end
  );
  const nextMarks = exists
    ? marks.filter(
        (mark) =>
          !(mark.type === type && mark.start === start && mark.end === end)
      )
    : [...marks, { end, start, type }];

  return {
    ...props,
    inlineMarks: nextMarks
  };
}

export function getInlineLinkProps(
  props: BlockProps,
  selection: { end: number; start: number } | null,
  href: string
) {
  const safeHref = normalizeLinkHref(href);

  if (!safeHref || !selection) {
    return null;
  }

  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);

  if (start === end) {
    return null;
  }

  return {
    ...props,
    inlineMarks: [
      ...getInlineMarks(props).filter(
        (mark) =>
          !(mark.type === "link" && mark.start === start && mark.end === end)
      ),
      { end, href: safeHref, start, type: "link" }
    ]
  };
}

export function getInlineTextSegments(text: string, props: BlockProps) {
  const marks = getInlineMarks(props).filter(
    (mark) => mark.start < mark.end && mark.start < text.length
  );

  if (marks.length === 0) {
    return [{ marks: [], text }];
  }

  const boundaries = new Set([0, text.length]);

  for (const mark of marks) {
    boundaries.add(clampOffset(mark.start, text));
    boundaries.add(clampOffset(mark.end, text));
  }

  const offsets = [...boundaries].sort((a, b) => a - b);
  const segments: InlineTextSegment[] = [];

  for (let index = 0; index < offsets.length - 1; index += 1) {
    const start = offsets[index];
    const end = offsets[index + 1];
    const segmentText = text.slice(start, end);

    if (!segmentText) {
      continue;
    }

    segments.push({
      href: marks
        .find(
          (mark) => mark.type === "link" && mark.start <= start && mark.end >= end
        )
        ?.href,
      marks: marks
        .filter((mark) => mark.start <= start && mark.end >= end)
        .flatMap((mark) => (mark.type === "link" ? [] : [mark.type])),
      text: segmentText
    });
  }

  return segments;
}

export function getInlineMarksAtOffset(
  props: BlockProps,
  offset: number
): TextStyleInlineMarkType[] {
  return getInlineMarks(props)
    .flatMap((mark) =>
      mark.type !== "link" && mark.start < offset && mark.end >= offset
        ? [mark.type]
        : []
    );
}

export function getInlineMarks(props: BlockProps): InlineMark[] {
  const marks = props.inlineMarks;

  if (!Array.isArray(marks)) {
    return [];
  }

  return marks.filter(isInlineMark);
}

function isInlineMark(value: unknown): value is InlineMark {
  if (!value || typeof value !== "object") {
    return false;
  }

  const mark = value as Partial<InlineMark>;

  return (
    typeof mark.start === "number" &&
    typeof mark.end === "number" &&
    (mark.type === "bold" ||
      mark.type === "italic" ||
      mark.type === "code" ||
      (mark.type === "link" && typeof mark.href === "string"))
  );
}

function clampOffset(offset: number, text: string) {
  return Math.max(0, Math.min(offset, text.length));
}

export function getInlineMarkType(commandId: string): InlineMarkType | null {
  switch (commandId) {
    case "format-bold":
      return "bold";
    case "format-italic":
      return "italic";
    case "format-inline-code":
      return "code";
    default:
      return null;
  }
}
