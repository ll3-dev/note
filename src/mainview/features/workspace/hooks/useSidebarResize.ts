import { useState } from "react";
import type { PointerEvent } from "react";

const SIDEBAR_MIN_WIDTH = 224;
const SIDEBAR_MAX_WIDTH = 360;

type UseSidebarResizeParams = {
  setSidebarWidth: (width: number) => void;
  sidebarWidth: number;
};

export function useSidebarResize({
  setSidebarWidth,
  sidebarWidth
}: UseSidebarResizeParams) {
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const handleResizeSidebar = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = startWidth + moveEvent.clientX - startX;
      const clampedWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, nextWidth)
      );

      setSidebarWidth(clampedWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  return { handleResizeSidebar, isResizingSidebar };
}
