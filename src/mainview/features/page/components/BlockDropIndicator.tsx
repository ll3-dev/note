import { useCallback, useState } from "react";
import { useViewportGeometrySync } from "../hooks/useViewportGeometrySync";
import type { BlockDropTarget } from "../lib/blockDrag";

type BlockDropIndicatorProps = {
  dropTarget: BlockDropTarget | null;
};

type DropIndicatorRect = {
  left: number;
  top: number;
  width: number;
};

export function BlockDropIndicator({ dropTarget }: BlockDropIndicatorProps) {
  const [rect, setRect] = useState<DropIndicatorRect | null>(null);
  const syncRect = useCallback(() => {
    if (!dropTarget) {
      setRect(null);
      return;
    }

    const blockRect = getBlockRect(dropTarget.blockId);
    if (!blockRect) {
      setRect(null);
      return;
    }

    setRect({
      left: blockRect.left,
      top:
        dropTarget.placement === "before"
          ? blockRect.top - 2
          : blockRect.bottom + 2,
      width: blockRect.width
    });
  }, [dropTarget]);

  useViewportGeometrySync({
    enabled: Boolean(dropTarget),
    onSync: syncRect
  });

  if (!rect) {
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

function getBlockRect(blockId: string) {
  const element = document.querySelector<HTMLElement>(
    `[data-block-id="${escapeSelectorValue(blockId)}"]`
  );

  return element?.getBoundingClientRect() ?? null;
}

function escapeSelectorValue(value: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value;
}
