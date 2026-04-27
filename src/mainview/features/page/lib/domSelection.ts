export function placeCursorAtEnd(element: HTMLElement) {
  const range = window.document.createRange();
  const selection = window.getSelection();

  element.focus();
  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function placeCursorAtStart(element: HTMLElement) {
  const range = window.document.createRange();
  const selection = window.getSelection();

  element.focus();
  range.selectNodeContents(element);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function isCursorAtStart(element: HTMLElement) {
  return getCursorOffset(element) === 0;
}

export function isCursorAtEnd(element: HTMLElement) {
  const offset = getCursorOffset(element);

  return offset !== null && offset === (element.textContent ?? "").length;
}

function getCursorOffset(element: HTMLElement) {
  const selection = window.getSelection();

  if (!selection?.rangeCount || !selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!element.contains(range.startContainer)) {
    return null;
  }

  const cursorRange = range.cloneRange();
  cursorRange.selectNodeContents(element);
  cursorRange.setEnd(range.startContainer, range.startOffset);

  return cursorRange.toString().length;
}
