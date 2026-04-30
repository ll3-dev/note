export function clearEditableFocusForBlockSelection(selectedBlockIds: string[]) {
  if (selectedBlockIds.length === 0) {
    return;
  }

  const activeElement = document.activeElement;

  if (!shouldBlurActiveElementForBlockSelection(activeElement, selectedBlockIds)) {
    return;
  }

  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }

  window.getSelection()?.removeAllRanges();
}

export function shouldBlurActiveElementForBlockSelection(
  activeElement: Element | null,
  selectedBlockIds: string[]
) {
  if (!activeElement?.closest("[contenteditable]")) {
    return false;
  }

  const blockElement = activeElement.closest("[data-block-id]");
  const blockId = blockElement?.getAttribute("data-block-id");

  return Boolean(blockId && selectedBlockIds.includes(blockId));
}
