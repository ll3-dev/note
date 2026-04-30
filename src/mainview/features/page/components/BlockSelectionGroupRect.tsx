import { useCallback, useState, type DragEvent } from "react";
import { useViewportGeometrySync } from "../hooks/useViewportGeometrySync";
import {
  getSelectionBoundsList,
  type SelectionBounds
} from "../lib/blockSelectionGeometry";

type BlockSelectionGroupRectProps = {
  blockIds: string[];
  isDragging: boolean;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
};

export function BlockSelectionGroupRect({
  blockIds,
  isDragging,
  onDragEnd,
  onDragStart
}: BlockSelectionGroupRectProps) {
  const [boundsList, setBoundsList] = useState<SelectionBounds[]>([]);
  const syncBoundsList = useCallback(() => {
    if (blockIds.length === 0) {
      setBoundsList([]);
      return;
    }

    setBoundsList(getSelectionBoundsList(blockIds));
  }, [blockIds]);

  useViewportGeometrySync({
    enabled: blockIds.length > 0,
    onSync: syncBoundsList
  });

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
