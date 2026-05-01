import type { Block, PageDocument } from "@/shared/contracts";
import { findAdjacentFocusableBlock } from "@/mainview/features/page/lib/blockFocus";

type FocusBlock = (blockId: string, placement?: "start" | "end") => void;

export function useBlockKeyboardFocus(
  document: PageDocument | null,
  focusBlock: FocusBlock
) {
  function focusPreviousBlock(block: Block) {
    const previous = findAdjacentFocusableBlock(document, block, -1);
    if (!previous) {
      return false;
    }

    focusBlock(previous.id);
    return true;
  }

  function focusNextBlock(block: Block) {
    const next = findAdjacentFocusableBlock(document, block, 1);
    if (!next) {
      return false;
    }

    focusBlock(next.id, "start");
    return true;
  }

  return { focusNextBlock, focusPreviousBlock };
}
