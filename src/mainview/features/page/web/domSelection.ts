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

export function placeCursorAtOffset(element: HTMLElement, offset: number) {
  const range = window.document.createRange();
  const selection = window.getSelection();
  const target = findTextPosition(element, offset);

  element.focus();
  range.setStart(target.node, target.offset);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function getTextSelectionOffsets(element: HTMLElement) {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  ) {
    return null;
  }

  return {
    end: getRangeOffset(element, range.endContainer, range.endOffset),
    start: getRangeOffset(element, range.startContainer, range.startOffset)
  };
}

export function getTextSelectionRect(element: HTMLElement) {
  const selection = window.getSelection();

  if (!selection?.rangeCount || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  ) {
    return null;
  }

  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return rect;
}

export function getCursorTextOffset(element: HTMLElement) {
  return getCursorOffset(element);
}

export function insertPlainTextAtSelection(element: HTMLElement, text: string) {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return false;
  }

  const range = selection.getRangeAt(0);

  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  ) {
    return false;
  }

  range.deleteContents();
  range.insertNode(window.document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function getCursorOffset(element: HTMLElement) {
  if (typeof window === "undefined") {
    return null;
  }

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

function getRangeOffset(
  element: HTMLElement,
  container: Node,
  offset: number
) {
  const range = window.document.createRange();

  range.selectNodeContents(element);
  range.setEnd(container, offset);

  return range.toString().length;
}

function findTextPosition(element: HTMLElement, offset: number) {
  const walker = window.document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT
  );
  let remaining = Math.max(0, offset);
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length ?? 0;

    if (remaining <= length) {
      return { node, offset: remaining };
    }

    remaining -= length;
    node = walker.nextNode();
  }

  return { node: element, offset: element.childNodes.length };
}
