import type {
  Block,
  BlockProps,
  BlockType
} from "../../../../shared/contracts";
import {
  getInlineMarks,
  type InlineMark
} from "./inlineFormatting";

export type CreateBlockDraft = {
  props?: BlockProps;
  text?: string;
  type?: BlockType;
};

export type SplitBlockDraft = {
  currentUpdate: {
    props: BlockProps;
    text: string;
  };
  nextDraft: CreateBlockDraft;
};

const MAX_BLOCK_DEPTH = 6;
const DEFAULT_NUMBERED_LIST_START = 1;
const CONTINUING_BLOCK_TYPES = new Set<BlockType>([
  "bulleted_list",
  "numbered_list",
  "todo",
  "quote",
  "code"
]);

export function getBlockDepth(block: Block) {
  const depth = block.props.depth;

  return typeof depth === "number" && Number.isInteger(depth) && depth > 0
    ? Math.min(depth, MAX_BLOCK_DEPTH)
    : 0;
}

export function getNumberedListStart(block: Block) {
  const start = block.props.start;

  return typeof start === "number" && Number.isInteger(start) && start > 0
    ? start
    : DEFAULT_NUMBERED_LIST_START;
}

export function getBlockIndentUpdate(
  block: Block,
  direction: "in" | "out",
  maxDepth = MAX_BLOCK_DEPTH
): { props: BlockProps } | null {
  const depth = getBlockDepth(block);
  const safeMaxDepth = Math.max(0, Math.min(maxDepth, MAX_BLOCK_DEPTH));
  const nextDepth =
    direction === "in"
      ? Math.min(depth + 1, safeMaxDepth)
      : Math.max(depth - 1, 0);

  if (nextDepth === depth) {
    return null;
  }

  const props = { ...block.props };

  if (nextDepth === 0) {
    delete props.depth;
  } else {
    props.depth = nextDepth;
  }

  return { props };
}

export function getNextBlockDraft(
  block: Block,
  numberedListMarker?: number
): CreateBlockDraft {
  if (!CONTINUING_BLOCK_TYPES.has(block.type)) {
    return {
      props: pickDepthProps(block),
      type: "paragraph"
    };
  }

  if (block.type === "todo") {
    return {
      props: { ...pickDepthProps(block), checked: false },
      type: "todo"
    };
  }

  if (block.type === "numbered_list") {
    return {
      props: {
        ...pickDepthProps(block),
        start: (numberedListMarker ?? getNumberedListStart(block)) + 1
      },
      type: "numbered_list"
    };
  }

  return {
    props: pickDepthProps(block),
    type: block.type
  };
}

export function getSplitBlockDraft(
  block: Block,
  text: string,
  props: BlockProps,
  offset: number,
  numberedListMarker?: number
): SplitBlockDraft {
  const splitOffset = clampOffset(offset, text);
  const currentText = text.slice(0, splitOffset);
  const nextText = text.slice(splitOffset);
  const nextDraft = getNextBlockDraft({ ...block, props }, numberedListMarker);

  return {
    currentUpdate: {
      props: withInlineMarks(props, sliceInlineMarks(props, 0, splitOffset)),
      text: currentText
    },
    nextDraft: {
      ...nextDraft,
      props: withInlineMarks(
        nextDraft.props ?? {},
        sliceInlineMarks(props, splitOffset, text.length, -splitOffset)
      ),
      text: nextText
    }
  };
}

export function getMergedBlockUpdate(
  previousBlock: Block,
  currentBlock: Block,
  currentText = currentBlock.text,
  currentProps = currentBlock.props
) {
  const previousText = previousBlock.text;
  const mergedMarks = [
    ...getInlineMarks(previousBlock.props),
    ...shiftInlineMarks(currentProps, previousText.length)
  ];

  return {
    props: withInlineMarks(previousBlock.props, mergedMarks),
    text: previousText + currentText
  };
}

function pickDepthProps(block: Block): BlockProps {
  const depth = getBlockDepth(block);

  return depth > 0 ? { depth } : {};
}

function sliceInlineMarks(
  props: BlockProps,
  start: number,
  end: number,
  delta = 0
): InlineMark[] {
  return getInlineMarks(props)
    .map((mark) => ({
      ...mark,
      end: Math.min(mark.end, end) + delta,
      start: Math.max(mark.start, start) + delta
    }))
    .filter((mark) => mark.start < mark.end);
}

function shiftInlineMarks(props: BlockProps, offset: number): InlineMark[] {
  return getInlineMarks(props).map((mark) => ({
    ...mark,
    end: mark.end + offset,
    start: mark.start + offset
  }));
}

function withInlineMarks(props: BlockProps, marks: InlineMark[]): BlockProps {
  const nextProps = { ...props };

  if (marks.length > 0) {
    nextProps.inlineMarks = marks;
  } else {
    delete nextProps.inlineMarks;
  }

  return nextProps;
}

function clampOffset(offset: number, text: string) {
  return Math.max(0, Math.min(offset, text.length));
}
