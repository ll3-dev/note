import { useEffect, useRef } from "react";
import { useBlockDragState } from "@/mainview/features/page/hooks/useBlockDragState";
import { useInputMode } from "@/mainview/features/page/hooks/useInputMode";
import { useLastBlockFocus } from "@/mainview/features/page/hooks/useLastBlockFocus";
import { usePageEditorInteractions } from "@/mainview/features/page/hooks/usePageEditorInteractions";
import { useSelectedBlockShortcuts } from "@/mainview/features/page/hooks/useSelectedBlockShortcuts";
import { clearEditableFocusForBlockSelection } from "@/mainview/features/page/web/blockSelectionFocus";
import { focusEditableBlockById } from "@/mainview/features/page/web/blockFocusDom";
import { scrollBlockIntoView } from "@/mainview/features/page/web/blockScroll";
import type {
  BlockEditorActions,
  BlockEditorDragActions
} from "@/mainview/features/page/types/blockEditorTypes";
import type { PageEditorControllerOptions } from "@/mainview/features/page/types/pageEditorTypes";

export function usePageEditorController({
  document,
  onCreateBlockAfter,
  onCreatePageLink,
  onDeleteBlock,
  onDeleteBlocks,
  onDuplicateBlocks,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onIndentBlocks,
  onMergeBlockWithPrevious,
  onMoveBlockOutOfParent,
  onMoveBlocks,
  onOpenPageLink,
  onPasteBlocks,
  onPasteMarkdown,
  onRestorePageLink,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdateBlock,
  openSearch
}: PageEditorControllerOptions) {
  useInputMode();
  const focusLastBlock = useLastBlockFocus({ document, onCreateBlockAfter });
  const {
    beginBlockSelectionDrag,
    clearBlockSelection,
    clearDragState,
    consumeCompletedBlockRangeSelection,
    draggedBlockId,
    dragPreview,
    dropBlock,
    dropTarget,
    isBlockRangeSelecting,
    pressBlockDragHandle,
    selectBlock,
    selectionAnchorBlockId,
    selectionFocusBlockId,
    applyKeyboardBlockSelection,
    setBlockSelection,
    selectedBlockIds,
    selectionBox,
    setDropPlacement,
    startDrag
  } = useBlockDragState({
    blocks: document.blocks,
    onMoveBlocks
  });
  const {
    focusPreviousBlock,
    handleEditorClick,
    handleEditorMouseDown,
    handleSelectedBlocksDragStart,
    selectedBlocks,
    titleRef
  } = usePageEditorInteractions({
    document,
    selectedBlockIds,
    onBeginBlockSelectionDrag: beginBlockSelectionDrag,
    onClearBlockSelection: clearBlockSelection,
    onConsumeCompletedBlockRangeSelection: consumeCompletedBlockRangeSelection,
    onFocusLastBlock: focusLastBlock,
    onFocusPreviousBlock,
    onStartDrag: startDrag
  });
  const clearBlockSelectionRef = useRef(clearBlockSelection);

  useEffect(() => {
    clearBlockSelectionRef.current = clearBlockSelection;
  }, [clearBlockSelection]);

  useSelectedBlockShortcuts({
    clearSelection: clearBlockSelection,
    document,
    onDeleteBlocks,
    onDuplicateBlocks,
    onFocusBlock: focusEditableBlockById,
    onFocusTitle: () => titleRef.current?.focus(),
    onIndentBlocks,
    onKeyboardSelection: applyKeyboardBlockSelection,
    onMoveBlocks,
    onPasteBlocks,
    selectionAnchorBlockId,
    selectionFocusBlockId,
    setSelection: setBlockSelection,
    selectedBlocks
  });

  useEffect(() => {
    clearEditableFocusForBlockSelection(selectedBlockIds);
  }, [selectedBlockIds]);

  useEffect(() => {
    if (selectedBlockIds.length === 0) {
      return;
    }

    function handleHistoryCommand() {
      clearBlockSelection();
    }

    window.addEventListener("note-history-command", handleHistoryCommand);

    return () => {
      window.removeEventListener("note-history-command", handleHistoryCommand);
    };
  }, [clearBlockSelection, selectedBlockIds.length]);

  useEffect(() => {
    function handleClearBlockSelection() {
      clearBlockSelectionRef.current();
    }

    window.addEventListener("note-clear-block-selection", handleClearBlockSelection);

    return () => {
      window.removeEventListener(
        "note-clear-block-selection",
        handleClearBlockSelection
      );
    };
  }, []);

  useEffect(() => {
    scrollBlockIntoView(selectionFocusBlockId);
  }, [selectionFocusBlockId]);

  const blockEditorActions = {
    onCreateAfter: onCreateBlockAfter,
    onCreatePageLink,
    onDelete: onDeleteBlock,
    onFocusNext: onFocusNextBlock,
    onFocusPrevious: onFocusPreviousBlock,
    onMergeWithPrevious: onMergeBlockWithPrevious,
    onMoveOutOfParent: onMoveBlockOutOfParent,
    onOpenPageLink,
    onPasteMarkdown,
    onRestorePageLink,
    onTextDraftChange,
    onTextDraftFlush,
    onTextHistoryApply,
    onTextRedo,
    onTextUndo,
    onUpdate: onUpdateBlock,
    openSearch
  } satisfies BlockEditorActions;
  const blockDragActions = {
    onDragEnd: clearDragState,
    onDragOver: setDropPlacement,
    onDragPointerDown: pressBlockDragHandle,
    onSelectBlock: selectBlock,
    onDragStart: startDrag,
    onDrop: dropBlock
  } satisfies BlockEditorDragActions;

  return {
    blockDragActions,
    blockEditorActions,
    blockSelectionState: {
      draggedBlockId,
      isBlockRangeSelecting,
      selectedBlockIds
    },
    clearDragState,
    dragPreview,
    dropTarget,
    focusPreviousBlock,
    handleEditorClick,
    handleEditorMouseDown,
    handleSelectedBlocksDragStart,
    selectedBlockIds,
    selectionBox,
    titleRef
  };
}
