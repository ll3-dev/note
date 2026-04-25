import { useEffect } from "react";

export function useInputMode() {
  useEffect(() => {
    function useKeyboardMode() {
      window.document.body.dataset.inputMode = "keyboard";
    }

    function usePointerMode() {
      window.document.body.dataset.inputMode = "pointer";
    }

    window.addEventListener("keydown", useKeyboardMode);
    window.addEventListener("pointermove", usePointerMode);
    window.addEventListener("pointerdown", usePointerMode);

    return () => {
      window.removeEventListener("keydown", useKeyboardMode);
      window.removeEventListener("pointermove", usePointerMode);
      window.removeEventListener("pointerdown", usePointerMode);
      delete window.document.body.dataset.inputMode;
    };
  }, []);
}
