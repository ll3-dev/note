import type { Block } from "@/shared/contracts";
import { getBlockDepth } from "./blockEditingBehavior";

export type BlockTreeNode = {
  block: Block;
  children: BlockTreeNode[];
};

export function buildBlockTree(blocks: Block[]): BlockTreeNode[] {
  const nodesById = new Map<string, BlockTreeNode>();
  const roots: BlockTreeNode[] = [];

  for (const block of blocks) {
    nodesById.set(block.id, { block, children: [] });
  }

  for (const block of blocks) {
    const node = nodesById.get(block.id);

    if (!node) {
      continue;
    }

    const parentNode = block.parentBlockId
      ? nodesById.get(block.parentBlockId)
      : null;

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return sortTreeNodes(roots);
}

export function getVisibleBlocks(blocks: Block[]) {
  const collapsedDepths: number[] = [];

  return blocks.filter((block) => {
    const depth = getBlockDepth(block);

    while (
      collapsedDepths.length > 0 &&
      collapsedDepths[collapsedDepths.length - 1] >= depth
    ) {
      collapsedDepths.pop();
    }

    if (collapsedDepths.length > 0) {
      return false;
    }

    if (isCollapsedToggle(block)) {
      collapsedDepths.push(depth);
    }

    return true;
  });
}

export function getBlocksWithDescendants(
  blocks: Block[],
  selectedBlocks: Block[]
) {
  if (selectedBlocks.length === 0) {
    return [];
  }

  const selectedIds = new Set(selectedBlocks.map((block) => block.id));
  const expandedIds = new Set<string>();

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (!selectedIds.has(block.id)) {
      continue;
    }

    expandedIds.add(block.id);
    for (const descendant of getFollowingDescendants(blocks, index)) {
      expandedIds.add(descendant.id);
    }
  }

  return blocks.filter((block) => expandedIds.has(block.id));
}

export function getFollowingDescendants(blocks: Block[], index: number) {
  const block = blocks[index];

  if (!block) {
    return [];
  }

  const depth = getBlockDepth(block);
  const descendants: Block[] = [];

  for (let nextIndex = index + 1; nextIndex < blocks.length; nextIndex += 1) {
    const nextBlock = blocks[nextIndex];

    if (getBlockDepth(nextBlock) <= depth) {
      break;
    }

    descendants.push(nextBlock);
  }

  return descendants;
}

export function getSubtreeSafeAfterBlockId(
  _blocks: Block[],
  movingBlocks: Block[],
  afterBlockId: string | null
) {
  if (afterBlockId === null) {
    return null;
  }

  const movingIds = new Set(movingBlocks.map((block) => block.id));

  return movingIds.has(afterBlockId) ? undefined : afterBlockId;
}

export function getParentBlockOutdentTarget(blocks: Block[], block: Block) {
  if (!block.parentBlockId) {
    return null;
  }

  const parentBlock = blocks.find((item) => item.id === block.parentBlockId);

  if (!parentBlock) {
    return null;
  }

  return {
    afterBlockId: parentBlock.id,
    parentBlockId: parentBlock.parentBlockId
  };
}

export function getIndentedSubtreeBlockUpdates(
  blocks: Block[],
  selectedBlocks: Block[],
  direction: "in" | "out",
  maxDepth = 6
) {
  const expandedBlocks = getBlocksWithDescendants(blocks, selectedBlocks);
  const selectedIds = new Set(selectedBlocks.map((block) => block.id));

  return expandedBlocks
    .map((block) => {
      const currentDepth = getBlockDepth(block);
      const canIndentRoot =
        direction === "out" || !selectedIds.has(block.id) || canIndentBlock(blocks, block);
      const nextDepth =
        direction === "in" && canIndentRoot
          ? Math.min(maxDepth, currentDepth + 1)
          : direction === "out"
            ? Math.max(0, currentDepth - 1)
            : currentDepth;

      if (nextDepth === currentDepth) {
        return null;
      }

      const props = { ...block.props };

      if (nextDepth === 0) {
        delete props.depth;
      } else {
        props.depth = nextDepth;
      }

      return { block, props };
    })
    .filter((update) => update !== null);
}

function canIndentBlock(blocks: Block[], block: Block) {
  const index = blocks.findIndex((item) => item.id === block.id);

  return index > 0 && getBlockDepth(blocks[index - 1]) >= getBlockDepth(block);
}

function isCollapsedToggle(block: Block) {
  return block.type === "toggle" && block.props.open === false;
}

function sortTreeNodes(nodes: BlockTreeNode[]): BlockTreeNode[] {
  nodes.sort(compareBlockOrder);

  for (const node of nodes) {
    sortTreeNodes(node.children);
  }

  return nodes;
}

function compareBlockOrder(left: BlockTreeNode, right: BlockTreeNode) {
  return left.block.sortKey.localeCompare(right.block.sortKey);
}
