import { useLayoutEffect, useState, type DragEvent } from "react";

type BlockSelectionGroupRectProps = {
  blockIds: string[];
  isDragging: boolean;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
};

type SelectionBounds = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export function BlockSelectionGroupRect({
  blockIds,
  isDragging,
  onDragEnd,
  onDragStart
}: BlockSelectionGroupRectProps) {
  const [boundsList, setBoundsList] = useState<SelectionBounds[]>([]);

  useLayoutEffect(() => {
    if (blockIds.length === 0) {
      setBoundsList([]);
      return;
    }

    setBoundsList(getSelectionBoundsList(blockIds));
  }, [blockIds]);

  if (boundsList.length === 0) {
    return null;
  }

  return (
    <>
      {boundsList.map((bounds) => (
        <div
          className="fixed z-20 cursor-grab rounded-[4px] active:cursor-grabbing"
          draggable={!isDragging}
          key={`${bounds.left}:${bounds.top}:${bounds.right}:${bounds.bottom}`}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          style={{
            backgroundColor:
              "color-mix(in oklab, var(--foreground) 5%, transparent)",
            height: bounds.bottom - bounds.top,
            left: bounds.left,
            pointerEvents: isDragging ? "none" : "auto",
            top: bounds.top,
            width: bounds.right - bounds.left
          }}
        />
      ))}
    </>
  );
}

function getSelectionBoundsList(blockIds: string[]) {
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
