import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import type { Block } from "../../../../shared/contracts";
import type { TextSelectionOffsets } from "../types/blockEditorTypes";
import {
  getTextSelectionOffsets,
  insertPlainTextAtSelection
} from "../lib/domSelection";
import { shouldHandleMarkdownPaste } from "../lib/markdownBlocks";

type UseBlockClipboardEditingOptions = {
  block: Block;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
};

export function useBlockClipboardEditing({
  block,
  onChange,
  onKeyDown,
  onPasteMarkdown
}: UseBlockClipboardEditingOptions) {
  const lastPasteEventAtRef = useRef(0);

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    lastPasteEventAtRef.current = Date.now();
    const text = event.clipboardData.getData("text/plain");

    if (shouldHandleMarkdownPaste(text)) {
      const selection = getTextSelectionOffsets(event.currentTarget) ?? {
        end: event.currentTarget.textContent?.length ?? 0,
        start: event.currentTarget.textContent?.length ?? 0
      };

      event.preventDefault();
      void onPasteMarkdown(block, text, event.currentTarget, selection);
      return;
    }

    event.preventDefault();
    insertClipboardText(event.currentTarget, text);
  }

  function handleEditableKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const shouldReadClipboard = isModKey(event) && event.key.toLowerCase() === "v";
    const shouldWriteClipboard = isModKey(event) && event.key.toLowerCase() === "c";
    const editable = event.currentTarget;

    onKeyDown(event);

    if (event.defaultPrevented) {
      return;
    }

    if (shouldWriteClipboard) {
      void copySelectionFallback(editable);
      return;
    }

    if (shouldReadClipboard) {
      void pasteClipboardFallback(editable);
    }
  }

  async function pasteClipboardFallback(editable: HTMLElement) {
    const readText = navigator.clipboard?.readText;

    if (!readText) {
      return;
    }

    let text = "";

    try {
      text = await readText.call(navigator.clipboard);
    } catch {
      return;
    }

    window.setTimeout(() => {
      if (!text || Date.now() - lastPasteEventAtRef.current < 500) {
        return;
      }

      insertClipboardText(editable, text);
    }, 20);
  }

  function insertClipboardText(editable: HTMLElement, text: string) {
    if (insertPlainTextAtSelection(editable, text)) {
      onChange(editable.textContent ?? "");
    }
  }

  return { handleEditableKeyDown, handlePaste };
}

async function copySelectionFallback(editable: HTMLElement) {
  const selection = window.getSelection();

  if (
    !selection ||
    selection.isCollapsed ||
    !editable.contains(selection.anchorNode) ||
    !editable.contains(selection.focusNode)
  ) {
    return;
  }

  try {
    await navigator.clipboard?.writeText(selection.toString());
  } catch {
    // Native copy still handles the common path; this only covers missing app accelerators.
  }
}

function isModKey(event: KeyboardEvent<HTMLElement>) {
  return event.metaKey || event.ctrlKey;
}
