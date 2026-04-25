export function placeCursorAtEnd(element: HTMLElement) {
  const range = window.document.createRange();
  const selection = window.getSelection();

  element.focus();
  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
