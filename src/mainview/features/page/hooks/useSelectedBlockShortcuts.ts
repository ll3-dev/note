import { useEffect } from "react";
import type { Block, PageDocument } from "@/shared/contracts";
import { copyBlocksToClipboard } from "@/mainview/features/page/lib/blockClipboard";
import { getAfterBlockIdForKeyboardBlockMove } from "@/mainview/features/page/lib/blockDrag";
import {
  getIndentedSubtreeBlockUpdates,
  getBlocksWithDescendants,
  getSubtreeSafeAfterBlockId
} from "@/mainview/features/page/lib/blockTree";
import {
  getKeyboardBlockSelection,
  type KeyboardBlockSelectionResult
} from "@/mainview/features/page/lib/blockSelection";

type UseSelectedBlockShortcutsOptions = {
  clearSelection: () => void;
  document: PageDocument;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onFocusBlock: (blockId: string) => void;
  onFocusTitle: () => void;
  onIndentBlocks: (blocks: Array<{ block: Block; props: Block["props"] }>) => void;
  onMoveBlocks: (blocks: Block[], afterBlockId: string | null) => Promise<void> | void;
  onPasteBlocks: (afterBlock: Block) => Promise<Block[]> | Block[];
  onKeyboardSelection: (selection: KeyboardBlockSelectionResult) => void;
  selectionAnchorBlockId: string | null;
  selectionFocusBlockId: string | null;
  setSelection: (blockIds: string[]) => void;
  selectedBlocks: Block[];
};

export function useSelectedBlockShortcuts({
  clearSelection,
  document,
  onDeleteBlocks,
  onDuplicateBlocks,
  onFocusBlock,
  onFocusTitle,
  onIndentBlocks,
  onMoveBlocks,
  onKeyboardSelection,
  onPasteBlocks,
  selectionAnchorBlockId,
  selectionFocusBlockId,
  setSelection,
  selectedBlocks
}: UseSelectedBlockShortcutsOptions) {
  useEffect(() => {
    const selectedBlockIds = selectedBlocks.map((block) => block.id);

    function handleKeyDown(event: KeyboardEvent) {
      if (isModKey(event) && event.key.toLowerCase() === "a") {
        if (handleSelectAllShortcut(event, selectedBlockIds)) {
          return;
        }
      }

      if (selectedBlocks.length === 0) {
        if (event.key === "Escape") {
          handleEditableEscape(event);
        }
        return;
      }

      if (
        isModKey(event) &&
        event.shiftKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        handleKeyboardBlockMove(
          event,
          event.key === "ArrowUp" ? "up" : "down"
        );
        return;
      }

      if (event.key === "Tab") {
        if (shouldIgnoreSelectedBlockShortcutTarget(event.target, selectedBlockIds)) {
          return;
        }

        const updates = getIndentedSubtreeBlockUpdates(
          document.blocks,
          selectedBlocks,
          event.shiftKey ? "out" : "in"
        );

        if (updates.length > 0) {
          event.preventDefault();
          onIndentBlocks(updates);
        }
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        if (shouldIgnoreSelectedBlockShortcutTarget(event.target, selectedBlockIds)) {
          return;
        }

        if (
          event.key === "ArrowUp" &&
          !event.shiftKey &&
          isFirstBlockFocused(document, selectionFocusBlockId, selectedBlockIds)
        ) {
          event.preventDefault();
          clearSelection();
          onFocusTitle();
          return;
        }

        const nextSelection = getKeyboardBlockSelection(
          document.blocks,
          {
            anchorBlockId: selectionAnchorBlockId,
            focusBlockId: selectionFocusBlockId,
            selectedBlockIds
          },
          event.key === "ArrowUp" ? "up" : "down",
          event.shiftKey
        );

        if (nextSelection) {
          event.preventDefault();
          onKeyboardSelection(nextSelection);
        }
        return;
      }

      if (event.key === "Enter") {
        if (shouldIgnoreSelectedBlockShortcutTarget(event.target, selectedBlockIds)) {
          return;
        }

        const targetBlockId = getSelectedBlockEditTargetId(
          selectedBlockIds,
          selectionFocusBlockId
        );

        if (targetBlockId) {
          event.preventDefault();
          clearSelection();
          onFocusBlock(targetBlockId);
        }
        return;
      }

      if (shouldIgnoreSelectedBlockShortcutTarget(event.target, selectedBlockIds)) {
        return;
      }

      if (isModKey(event) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        void copyBlocksToClipboard(
          document,
          getBlocksWithDescendants(document.blocks, selectedBlocks)
        );
        return;
      }

      if (isModKey(event) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        const afterBlock = selectedBlocks[selectedBlocks.length - 1];
        void Promise.resolve(onPasteBlocks(afterBlock)).then((createdBlocks) => {
          if (createdBlocks.length > 0) {
            setSelection(createdBlocks.map((block) => block.id));
          }
        });
        return;
      }

      if (isModKey(event) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        onDuplicateBlocks(selectedBlocks);
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

    function handleEditableEscape(event: KeyboardEvent) {
      const targetBlockId = getTargetBlockId(event.target);

      if (!targetBlockId || shouldIgnoreEditableEscapeTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setSelection([targetBlockId]);
    }

    function handleKeyboardBlockMove(
      event: KeyboardEvent,
      direction: "down" | "up"
    ) {
      if (shouldIgnoreSelectedBlockShortcutTarget(event.target, selectedBlockIds)) {
        return;
      }

      const afterBlockId = getAfterBlockIdForKeyboardBlockMove(
        document.blocks,
        selectedBlockIds,
        direction
      );
      const movingBlocks = getBlocksWithDescendants(document.blocks, selectedBlocks);
      const safeAfterBlockId = getSubtreeSafeAfterBlockId(
        document.blocks,
        movingBlocks,
        afterBlockId ?? null
      );

      if (afterBlockId === undefined || safeAfterBlockId === undefined) {
        return;
      }

      event.preventDefault();
      void onMoveBlocks(movingBlocks, safeAfterBlockId);
    }
  }, [
    clearSelection,
    document,
    onDeleteBlocks,
    onDuplicateBlocks,
    onFocusBlock,
    onFocusTitle,
    onIndentBlocks,
    onMoveBlocks,
    onKeyboardSelection,
    onPasteBlocks,
    selectionAnchorBlockId,
    selectionFocusBlockId,
    setSelection,
    selectedBlocks
  ]);

  function handleSelectAllShortcut(
    event: KeyboardEvent,
    selectedBlockIds: string[]
  ) {
    const nextSelection = getBlockSelectAllShortcutIds(
      document,
      selectedBlockIds,
      event.target
    );

    if (!nextSelection) {
      return false;
    }

    event.preventDefault();
    setSelection(nextSelection);
    return true;
  }
}

export function getSelectedBlockEditTargetId(
  selectedBlockIds: string[],
  selectionFocusBlockId: string | null
) {
  return selectionFocusBlockId ?? selectedBlockIds.at(-1) ?? null;
}

export function getBlockSelectAllShortcutIds(
  document: PageDocument,
  selectedBlockIds: string[],
  target: EventTarget | null
) {
  if (
    selectedBlockIds.length > 0 &&
    shouldIgnoreSelectedBlockShortcutTarget(target, selectedBlockIds)
  ) {
    return null;
  }

  if (selectedBlockIds.length > 0) {
    return document.blocks.map((block) => block.id);
  }

  const targetBlockId = getTargetBlockId(target);

  return targetBlockId ? [targetBlockId] : null;
}

function isFirstBlockFocused(
  document: PageDocument,
  selectionFocusBlockId: string | null,
  selectedBlockIds: string[]
) {
  const firstBlockId = document.blocks[0]?.id;
  const focusBlockId = selectionFocusBlockId ?? selectedBlockIds.at(-1) ?? null;

  return Boolean(firstBlockId && focusBlockId === firstBlockId);
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

function getTargetBlockId(target: EventTarget | null) {
  if (!isClosestTarget(target)) {
    return null;
  }

  return target.closest("[data-block-id]")?.getAttribute("data-block-id") ?? null;
}

function shouldIgnoreEditableEscapeTarget(target: EventTarget | null) {
  if (!isClosestTarget(target)) {
    return true;
  }

  return !target.closest("[contenteditable]");
}

function isModKey(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
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
