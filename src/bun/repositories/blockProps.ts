import type { BlockProps } from "../../shared/contracts";

const INLINE_MARK_TYPES = new Set(["bold", "italic", "code"]);

export function normalizeBlockProps(props: BlockProps, text: string): BlockProps {
  const inlineMarks = normalizeInlineMarks(props.inlineMarks, text.length);
  const nextProps: BlockProps = {};

  if (typeof props.checked === "boolean") {
    nextProps.checked = props.checked;
  }

  if (typeof props.depth === "number" && Number.isInteger(props.depth)) {
    nextProps.depth = Math.max(0, Math.min(props.depth, 6));
  }

  if (typeof props.start === "number" && Number.isInteger(props.start) && props.start > 0) {
    nextProps.start = Math.min(props.start, 999_999);
  }

  if (typeof props.language === "string") {
    nextProps.language = props.language.slice(0, 64);
  }

  if (inlineMarks.length > 0) {
    nextProps.inlineMarks = inlineMarks;
  }

  return nextProps;
}

function normalizeInlineMarks(value: unknown, textLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const mark = item as {
      end?: unknown;
      start?: unknown;
      type?: unknown;
    };

    if (
      typeof mark.start !== "number" ||
      typeof mark.end !== "number" ||
      typeof mark.type !== "string" ||
      !INLINE_MARK_TYPES.has(mark.type)
    ) {
      return [];
    }

    const start = clampOffset(Math.trunc(mark.start), textLength);
    const end = clampOffset(Math.trunc(mark.end), textLength);

    if (start >= end) {
      return [];
    }

    return [{ end, start, type: mark.type }];
  });
}

function clampOffset(offset: number, textLength: number) {
  return Math.max(0, Math.min(offset, textLength));
}
