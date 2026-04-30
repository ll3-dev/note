import type { Block, PageDocument } from "@/shared/contracts";

type FocusBlock = (blockId: string, placement?: "start" | "end") => void;

export function useBlockKeyboardFocus(
  document: PageDocument | null,
  focusBlock: FocusBlock
) {
  function focusPreviousBlock(block: Block) {
    const previous = findAdjacentBlock(document, block, -1);
    if (previous) focusBlock(previous.id);
  }

  function focusNextBlock(block: Block) {
    const next = findAdjacentBlock(document, block, 1);
    if (next) focusBlock(next.id, "start");
  }

  return { focusNextBlock, focusPreviousBlock };
}

function findAdjacentBlock(
  document: PageDocument | null,
  block: Block,
  direction: -1 | 1
) {
  const blocks = document?.blocks ?? [];
  const index = blocks.findIndex((item) => item.id === block.id);

  return index >= 0 ? blocks[index + direction] : null;
}
