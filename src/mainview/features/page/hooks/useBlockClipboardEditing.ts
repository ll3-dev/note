import {
  useRef,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent
} from "react";
import type { Block } from "@/shared/contracts";
import type { TextSelectionOffsets } from "@/mainview/features/page/types/blockEditorTypes";
import {
  getTextSelectionOffsets,
  insertPlainTextAtSelection
} from "@/mainview/features/page/web/domSelection";
import {
  getMarkdownClipboardFile,
  readMarkdownFromDataTransfer
} from "@/mainview/features/page/web/markdownClipboard";
import { shouldHandleMarkdownPaste } from "@/mainview/features/page/lib/markdownBlocks";

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
    const shouldReadMarkdownFile = Boolean(
      getMarkdownClipboardFile(event.clipboardData.files)
    );
    const html = event.clipboardData.getData("text/html");
    const markdownText = event.clipboardData.getData("text/markdown");
    const plainText = event.clipboardData.getData("text/plain");

    if (
      shouldReadMarkdownFile ||
      html ||
      markdownText ||
      shouldHandleMarkdownPaste(plainText)
    ) {
      event.preventDefault();
      void pasteMarkdownFromDataTransfer(event.currentTarget, event.clipboardData);
      return;
    }

    event.preventDefault();
    insertClipboardText(event.currentTarget, plainText);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!getMarkdownClipboardFile(event.dataTransfer.files)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void pasteMarkdownFromDataTransfer(event.currentTarget, event.dataTransfer);
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

  async function pasteMarkdownFromDataTransfer(
    editable: HTMLElement,
    dataTransfer: DataTransfer
  ) {
    const text = await readMarkdownFromDataTransfer(dataTransfer);
    const selection = getTextSelectionOffsets(editable) ?? {
      end: editable.textContent?.length ?? 0,
      start: editable.textContent?.length ?? 0
    };

    await onPasteMarkdown(block, text, editable, selection);
  }

  function insertClipboardText(editable: HTMLElement, text: string) {
    if (insertPlainTextAtSelection(editable, text)) {
      onChange(editable.textContent ?? "");
    }
  }

  return { handleDrop, handleEditableKeyDown, handlePaste };
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
