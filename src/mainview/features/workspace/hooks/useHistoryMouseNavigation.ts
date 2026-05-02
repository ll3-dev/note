import { useEffect, useRef } from "react";

type UseHistoryMouseNavigationOptions = {
  navigateTabHistory: (direction: "back" | "forward") => Promise<void>;
};

export function useHistoryMouseNavigation({
  navigateTabHistory
}: UseHistoryMouseNavigationOptions) {
  const lastHistoryMouseRef = useRef<{ button: number; time: number } | null>(null);

  useEffect(() => {
    function handleHistoryMouseButton(event: MouseEvent | PointerEvent) {
      if (event.button !== 3 && event.button !== 4) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      const lastHistoryMouse = lastHistoryMouseRef.current;

      if (
        lastHistoryMouse?.button === event.button &&
        now - lastHistoryMouse.time < 100
      ) {
        return;
      }

      lastHistoryMouseRef.current = { button: event.button, time: now };
      void navigateTabHistory(event.button === 3 ? "back" : "forward");
    }

    const options = { capture: true };

    window.addEventListener("auxclick", handleHistoryMouseButton, options);
    window.addEventListener("mousedown", handleHistoryMouseButton, options);
    window.addEventListener("mouseup", handleHistoryMouseButton, options);
    window.addEventListener("pointerdown", handleHistoryMouseButton, options);
    window.addEventListener("pointerup", handleHistoryMouseButton, options);

    return () => {
      window.removeEventListener("auxclick", handleHistoryMouseButton, options);
      window.removeEventListener("mousedown", handleHistoryMouseButton, options);
      window.removeEventListener("mouseup", handleHistoryMouseButton, options);
      window.removeEventListener("pointerdown", handleHistoryMouseButton, options);
      window.removeEventListener("pointerup", handleHistoryMouseButton, options);
    };
  }, [navigateTabHistory]);
}
