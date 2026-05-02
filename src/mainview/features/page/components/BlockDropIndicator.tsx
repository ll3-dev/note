import { useCallback, useState } from "react";
import { useViewportGeometrySync } from "@/mainview/features/page/hooks/useViewportGeometrySync";
import type { BlockDropTarget } from "@/mainview/features/page/lib/blockDrag";
import {
  getBlockDropIndicatorRect,
  type DropIndicatorRect
} from "@/mainview/features/page/web/blockDropIndicatorGeometry";

type BlockDropIndicatorProps = {
  dropTarget: BlockDropTarget | null;
};

export function BlockDropIndicator({ dropTarget }: BlockDropIndicatorProps) {
  const [rect, setRect] = useState<DropIndicatorRect | null>(null);
  const syncRect = useCallback(() => {
    setRect(getBlockDropIndicatorRect(dropTarget));
  }, [dropTarget]);

  useViewportGeometrySync({
    enabled: Boolean(dropTarget),
    onSync: syncRect
  });

  if (!dropTarget || !rect) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-30 h-0.5 rounded-full bg-blue-500"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width
      }}
    />
  );
}
