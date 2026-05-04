import type { Block, PageDocument } from "@/shared/contracts";
import { buildBlockTree, type BlockTreeNode } from "./blockTree";

export function findAdjacentFocusableBlock(
  document: PageDocument | null,
  block: Block,
  direction: -1 | 1
) {
  const blocks = getFocusableBlocks(document);
  const index = blocks.findIndex((item) => item.id === block.id);

  if (index < 0) {
    return null;
  }

  for (
    let cursor = index + direction;
    cursor >= 0 && cursor < blocks.length;
    cursor += direction
  ) {
    const candidate = blocks[cursor];

    if (candidate.type !== "divider") {
      return candidate;
    }
  }

  return null;
}

function getFocusableBlocks(document: PageDocument | null) {
  if (!document) {
    return [];
  }

  return flattenVisibleTree(buildBlockTree(document.blocks)).filter(isFocusableBlock);
}

function flattenVisibleTree(nodes: BlockTreeNode[]): Block[] {
  return nodes.flatMap((node) => {
    if (isCollapsedToggle(node.block)) {
      return [node.block];
    }

    return [node.block, ...flattenVisibleTree(node.children)];
  });
}

function isFocusableBlock(block: Block) {
  return block.type !== "divider" && block.type !== "callout";
}

function isCollapsedToggle(block: Block) {
  return block.type === "toggle" && block.props.open === false;
}
