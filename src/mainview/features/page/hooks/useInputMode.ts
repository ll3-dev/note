import { useEffect } from "react";

const KEYBOARD_MODE_DELAY_MS = 350;
const POINTER_MODE_DELAY_MS = 120;
const POINTER_MOVE_THRESHOLD_PX = 8;
const TEXT_INPUT_KEYS = new Set(["Backspace", "Delete", "Enter", "Tab"]);

export function useInputMode() {
  useEffect(() => {
    let keyboardModeTimer: ReturnType<typeof setTimeout> | null = null;
    let pointerModeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPointerPosition: { x: number; y: number } | null = null;

    function clearKeyboardTimer() {
      if (keyboardModeTimer) {
        clearTimeout(keyboardModeTimer);
        keyboardModeTimer = null;
      }
    }

    function clearPointerTimer() {
      if (pointerModeTimer) {
        clearTimeout(pointerModeTimer);
        pointerModeTimer = null;
      }
    }

    function useKeyboardMode() {
      window.document.body.dataset.inputMode = "keyboard";
    }

    function usePointerMode() {
      window.document.body.dataset.inputMode = "pointer";
    }

    function scheduleKeyboardMode(event: KeyboardEvent) {
      if (!shouldUseKeyboardMode(event)) {
        clearKeyboardTimer();
        usePointerMode();
        return;
      }

      clearPointerTimer();

      if (window.document.body.dataset.inputMode === "keyboard") {
        return;
      }

      if (!keyboardModeTimer) {
        keyboardModeTimer = setTimeout(() => {
          useKeyboardMode();
          keyboardModeTimer = null;
        }, KEYBOARD_MODE_DELAY_MS);
      }
    }

    function schedulePointerMode() {
      clearKeyboardTimer();

      if (window.document.body.dataset.inputMode === "pointer") {
        return;
      }

      if (!pointerModeTimer) {
        pointerModeTimer = setTimeout(() => {
          usePointerMode();
          pointerModeTimer = null;
        }, POINTER_MODE_DELAY_MS);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (!lastPointerPosition) {
        lastPointerPosition = { x: event.clientX, y: event.clientY };
        return;
      }

      const distance = Math.hypot(
        event.clientX - lastPointerPosition.x,
        event.clientY - lastPointerPosition.y
      );

      lastPointerPosition = { x: event.clientX, y: event.clientY };

      if (distance >= POINTER_MOVE_THRESHOLD_PX) {
        schedulePointerMode();
      }
    }

    window.addEventListener("keydown", scheduleKeyboardMode);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", schedulePointerMode);

    return () => {
      clearKeyboardTimer();
      clearPointerTimer();
      window.removeEventListener("keydown", scheduleKeyboardMode);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", schedulePointerMode);
      delete window.document.body.dataset.inputMode;
    };
  }, []);
}

function shouldUseKeyboardMode(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  return event.key.length === 1 || TEXT_INPUT_KEYS.has(event.key);
}
