import { placeCursorAtEnd, placeCursorAtStart } from "./domSelection";

type FocusPlacement = "start" | "end";

export function focusEditableBlockById(blockId: string, placement: FocusPlacement = "end") {
  window.requestAnimationFrame(() => {
    const focusTarget = getBlockFocusTarget(blockId);

    if (focusTarget?.isContentEditable) {
      if (placement === "start") {
        placeCursorAtStart(focusTarget);
      } else {
        placeCursorAtEnd(focusTarget);
      }
      return;
    }

    if (focusTarget) {
      focusTarget.focus();
    }
  });
}

export function getBlockFocusTarget(blockId: string) {
  return window.document.querySelector<HTMLElement>(
    `[data-block-focus-target][data-block-focus-target-id="${CSS.escape(blockId)}"]`
  );
}
