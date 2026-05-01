import { useCallback, useEffect, useState, type DragEvent } from "react";
import { useViewportGeometrySync } from "@/mainview/features/page/hooks/useViewportGeometrySync";
import {
  getSelectionBoundsList,
  type SelectionBounds
} from "@/mainview/features/page/web/blockSelectionGeometry";

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

  useEffect(() => {
    if (blockIds.length === 0) {
      setBoundsList([]);
    }
  }, [blockIds.length]);

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
          data-block-selection-overlay
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
