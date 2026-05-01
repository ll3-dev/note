import { placeCursorAtEnd } from "./domSelection";

export function focusEditableBlockById(blockId: string) {
  window.requestAnimationFrame(() => {
    const editable = window.document.querySelector<HTMLElement>(
      `[data-block-id="${blockId}"] [contenteditable]`
    );

    if (editable) {
      placeCursorAtEnd(editable);
      return;
    }

    const focusTarget = window.document.querySelector<HTMLElement>(
      `[data-block-id="${blockId}"] [data-block-focus-target]`
    );

    if (focusTarget) {
      focusTarget.focus();
    }
  });
}
