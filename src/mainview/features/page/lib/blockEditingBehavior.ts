import type {
  Block,
  BlockProps,
  BlockType
} from "../../../../shared/contracts";

export type CreateBlockDraft = {
  props?: BlockProps;
  text?: string;
  type?: BlockType;
};

const MAX_BLOCK_DEPTH = 6;
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

export function getNextBlockDraft(block: Block): CreateBlockDraft {
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

  return {
    props: pickDepthProps(block),
    type: block.type
  };
}

function pickDepthProps(block: Block): BlockProps {
  const depth = getBlockDepth(block);

  return depth > 0 ? { depth } : {};
}
