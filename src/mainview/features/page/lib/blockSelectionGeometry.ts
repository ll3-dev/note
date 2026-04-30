import type { Block } from "../../../../shared/contracts";

export type SelectionBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type SelectionBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type SelectionTarget = {
  blockId: string;
  rect: DOMRect;
};

export function getSelectionBox(
  originX: number,
  originY: number,
  currentX: number,
  currentY: number
): SelectionBox {
  const left = Math.min(originX, currentX);
  const top = Math.min(originY, currentY);

  return {
    height: Math.abs(currentY - originY),
    left,
    top,
    width: Math.abs(currentX - originX)
  };
}

export function getSelectionTargets(blocks: Block[]): SelectionTarget[] {
  return blocks.flatMap((block) => {
    const element = document.querySelector<HTMLElement>(
      `[data-block-id="${block.id}"]`
    );

    return element
      ? [{ blockId: block.id, rect: element.getBoundingClientRect() }]
      : [];
  });
}

export function getIntersectingBlockIds(
  targets: SelectionTarget[],
  selectionBox: SelectionBox
) {
  return targets
    .filter((target) => rectanglesIntersect(selectionBox, target.rect))
    .map((target) => target.blockId);
}

export function getSelectionBoundsList(blockIds: string[]) {
  const rects = blockIds
    .map((blockId) =>
      document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)
    )
    .filter((element): element is HTMLElement => Boolean(element))
    .map((element) => element.getBoundingClientRect());

  if (rects.length === 0) {
    return [];
  }

  return mergeNearbyBounds(rects.map(getPaddedBounds));
}

export function isPointerInsideBlock(
  blockElement: HTMLElement,
  event: MouseEvent
) {
  const rect = blockElement.getBoundingClientRect();

  return (
    event.clientX >= rect.left - 4 &&
    event.clientX <= rect.right + 4 &&
    event.clientY >= rect.top - 4 &&
    event.clientY <= rect.bottom + 4
  );
}

function rectanglesIntersect(selectionBox: SelectionBox, blockRect: DOMRect) {
  return (
    selectionBox.left < blockRect.right &&
    selectionBox.left + selectionBox.width > blockRect.left &&
    selectionBox.top < blockRect.bottom &&
    selectionBox.top + selectionBox.height > blockRect.top
  );
}

function getPaddedBounds(rect: DOMRect): SelectionBounds {
  return {
    bottom: rect.bottom + 1,
    left: rect.left - 3,
    right: rect.right + 3,
    top: rect.top - 1
  };
}

function mergeNearbyBounds(boundsList: SelectionBounds[]) {
  const sortedBounds = [...boundsList].sort((a, b) => a.top - b.top);
  const mergedBounds: SelectionBounds[] = [];

  for (const bounds of sortedBounds) {
    const lastBounds = mergedBounds.at(-1);

    if (!lastBounds || bounds.top - lastBounds.bottom > 3) {
      mergedBounds.push(bounds);
      continue;
    }

    lastBounds.bottom = Math.max(lastBounds.bottom, bounds.bottom);
    lastBounds.left = Math.min(lastBounds.left, bounds.left);
    lastBounds.right = Math.max(lastBounds.right, bounds.right);
    lastBounds.top = Math.min(lastBounds.top, bounds.top);
  }

  return mergedBounds;
}
