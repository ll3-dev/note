import type { Block } from "@/shared/contracts";
import { getBlockDepth } from "./blockEditingBehavior";
import { getNumberedListStartForDepth } from "./blockNumbering";

export function getMaxIndentDepth(blocks: Block[], index: number) {
  if (index === 0) {
    return 0;
  }

  return getBlockDepth(blocks[index - 1]) + 1;
}

export function getNumberedListStartAfterDepthChange(
  blocks: Block[],
  index: number,
  direction: "in" | "out",
  numberedListMarkers: Map<string, number>
) {
  const block = blocks[index];

  if (block.type !== "numbered_list") {
    return null;
  }

  const depth = getBlockDepth(block);
  const maxIndentDepth = getMaxIndentDepth(blocks, index);
  const targetDepth =
    direction === "in"
      ? Math.min(depth + 1, maxIndentDepth)
      : Math.max(depth - 1, 0);

  if (targetDepth === depth) {
    return null;
  }

  return getNumberedListStartForDepth(
    blocks,
    index,
    targetDepth,
    numberedListMarkers
  );
}
