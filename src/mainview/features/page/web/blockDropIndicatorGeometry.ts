import type { BlockDropTarget } from "@/mainview/features/page/lib/blockDrag";

export type DropIndicatorRect = {
  left: number;
  top: number;
  width: number;
};

export function getBlockDropIndicatorRect(
  dropTarget: BlockDropTarget | null
): DropIndicatorRect | null {
  if (!dropTarget) {
    return null;
  }

  const blockRect = getBlockRect(dropTarget.blockId);
  if (!blockRect) {
    return null;
  }

  return {
    left: blockRect.left,
    top:
      dropTarget.placement === "before"
        ? blockRect.top - 2
        : blockRect.bottom + 2,
    width: blockRect.width
  };
}

function getBlockRect(blockId: string) {
  const element = document.querySelector<HTMLElement>(
    `[data-block-id="${escapeSelectorValue(blockId)}"]`
  );

  return element?.getBoundingClientRect() ?? null;
}

function escapeSelectorValue(value: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value;
}
