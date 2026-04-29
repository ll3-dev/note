import { useEffect } from "react";
import type { Block, PageDocument } from "../../../../shared/contracts";
import { writeTextToClipboard } from "../../workspace/lib/clipboardText";
import { serializePageToMarkdown } from "../lib/markdownBlocks";

type UseSelectedBlockShortcutsOptions = {
  clearSelection: () => void;
  document: PageDocument;
  onDeleteBlocks: (blocks: Block[]) => void;
  selectedBlocks: Block[];
};

export function useSelectedBlockShortcuts({
  clearSelection,
  document,
  onDeleteBlocks,
  selectedBlocks
}: UseSelectedBlockShortcutsOptions) {
  useEffect(() => {
    const selectedBlockIds = selectedBlocks.map((block) => block.id);

    function handleKeyDown(event: KeyboardEvent) {
      if (selectedBlocks.length === 0) {
        return;
      }

      if (shouldIgnoreSelectedBlockShortcutTarget(event.target, selectedBlockIds)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void copySelectedBlocks(document, selectedBlocks);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        onDeleteBlocks(selectedBlocks);
        clearSelection();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearSelection, document, onDeleteBlocks, selectedBlocks]);
}

export function shouldIgnoreSelectedBlockShortcutTarget(
  target: EventTarget | null,
  selectedBlockIds: string[]
) {
  if (!isClosestTarget(target)) {
    return false;
  }

  const editableTarget = target.closest(
    "input,textarea,select,[contenteditable]"
  );

  if (!editableTarget) {
    return false;
  }

  const blockElement = target.closest("[data-block-id]");
  const blockId = blockElement?.getAttribute("data-block-id");

  return !blockId || !selectedBlockIds.includes(blockId);
}

function isClosestTarget(
  target: EventTarget | null
): target is EventTarget & {
  closest: (selector: string) => Element | null;
} {
  return (
    typeof target === "object" &&
    target !== null &&
    "closest" in target &&
    typeof target.closest === "function"
  );
}

async function copySelectedBlocks(document: PageDocument, selectedBlocks: Block[]) {
  await writeTextToClipboard(
    serializePageToMarkdown({ ...document, blocks: selectedBlocks })
  );
}
