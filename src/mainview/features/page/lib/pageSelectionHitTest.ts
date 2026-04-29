import type { MouseEvent } from "react";

export function getNativeTextSelectionBlock(event: MouseEvent<HTMLElement>) {
  if (!(event.target instanceof HTMLElement)) {
    return null;
  }

  if (event.target.closest("input,textarea,select")) {
    return null;
  }

  const editable = event.target.closest<HTMLElement>("[contenteditable]");

  if (!editable) {
    return null;
  }

  if (!isPointerOnEditableText(editable, event.clientX, event.clientY)) {
    return null;
  }

  return editable.closest<HTMLElement>("[data-block-id]");
}

function isPointerOnEditableText(
  editable: HTMLElement,
  clientX: number,
  clientY: number
) {
  const text = editable.textContent ?? "";

  if (text.length === 0) {
    return false;
  }

  const range = document.createRange();
  range.selectNodeContents(editable);

  const textRects = Array.from(range.getClientRects());
  range.detach();

  return textRects.some(
    (rect) =>
      clientX >= rect.left - 2 &&
      clientX <= rect.right + 2 &&
      clientY >= rect.top - 2 &&
      clientY <= rect.bottom + 2
  );
}
