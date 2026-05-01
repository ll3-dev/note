import type { BlockProps } from "@/shared/contracts";
import { normalizeLinkHref } from "@/shared/linkSanitization";

const INLINE_MARK_TYPES = new Set(["bold", "italic", "code", "link"]);

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

  if (typeof props.targetPageId === "string") {
    nextProps.targetPageId = props.targetPageId.slice(0, 128);
  }

  if (typeof props.targetTitle === "string") {
    nextProps.targetTitle = props.targetTitle.slice(0, 200);
  }

  if (typeof props.src === "string") {
    nextProps.src = props.src.slice(0, 4_000);
  }

  if (typeof props.alt === "string") {
    nextProps.alt = props.alt.slice(0, 500);
  }

  if (typeof props.caption === "string") {
    nextProps.caption = props.caption.slice(0, 1_000);
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
      href?: unknown;
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

    if (mark.type === "link") {
      const href =
        typeof mark.href === "string" ? normalizeLinkHref(mark.href) : "";

      return href ? [{ end, href, start, type: mark.type }] : [];
    }

    return [{ end, start, type: mark.type }];
  });
}

function clampOffset(offset: number, textLength: number) {
  return Math.max(0, Math.min(offset, textLength));
}
