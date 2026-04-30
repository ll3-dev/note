import { useLayoutEffect, type RefObject } from "react";

type UseViewportGeometrySyncOptions = {
  enabled: boolean;
  observeRef?: RefObject<Element | null>;
  onSync: () => void;
};

export function useViewportGeometrySync({
  enabled,
  observeRef,
  onSync
}: UseViewportGeometrySyncOptions) {
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    let animationFrameId: number | null = null;

    function scheduleSync() {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        onSync();
      });
    }

    const resizeObserver =
      observeRef?.current && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleSync)
        : null;

    onSync();
    if (observeRef?.current) {
      resizeObserver?.observe(observeRef.current);
    }
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("scroll", scheduleSync, true);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("scroll", scheduleSync, true);
    };
  }, [enabled, observeRef, onSync]);
}
