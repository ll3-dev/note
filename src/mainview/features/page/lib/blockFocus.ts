import type { Block, PageDocument } from "@/shared/contracts";

export function findAdjacentFocusableBlock(
  document: PageDocument | null,
  block: Block,
  direction: -1 | 1
) {
  const blocks = document?.blocks ?? [];
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
