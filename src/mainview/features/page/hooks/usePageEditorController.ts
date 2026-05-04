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
  blockActions,
  blockCollectionActions,
  document,
  textActions,
  openSearch
}: PageEditorControllerOptions) {
  useInputMode();
  const focusLastBlock = useLastBlockFocus({
    document,
    onCreateBlockAfter: blockActions.createAfter
  });
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
    onMoveBlocks: blockCollectionActions.moveMany
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
    onFocusPreviousBlock: blockActions.focusPrevious,
    onStartDrag: startDrag
  });
  const clearBlockSelectionRef = useRef(clearBlockSelection);

  useEffect(() => {
    clearBlockSelectionRef.current = clearBlockSelection;
  }, [clearBlockSelection]);

  useSelectedBlockShortcuts({
    clearSelection: clearBlockSelection,
    document,
    onDeleteBlocks: blockCollectionActions.deleteMany,
    onDuplicateBlocks: blockCollectionActions.duplicateMany,
    onFocusBlock: focusEditableBlockById,
    onFocusTitle: () => titleRef.current?.focus(),
    onIndentBlocks: blockCollectionActions.indentMany,
    onKeyboardSelection: applyKeyboardBlockSelection,
    onMoveBlocks: blockCollectionActions.moveMany,
    onPasteBlocks: blockCollectionActions.pasteAfter,
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
    onCreateAfter: blockActions.createAfter,
    onCreatePageLink: blockActions.createPageLink,
    onDelete: blockActions.deleteOne,
    onFocusNext: blockActions.focusNext,
    onFocusPrevious: blockActions.focusPrevious,
    onMergeWithPrevious: blockActions.mergeWithPrevious,
    onMoveOutOfParent: blockActions.moveOutOfParent,
    onOpenPageLink: blockActions.openPageLink,
    onPasteMarkdown: textActions.pasteMarkdown,
    onRestorePageLink: blockActions.restorePageLink,
    onTextDraftChange: textActions.changeDraft,
    onTextDraftFlush: textActions.flushDraft,
    onTextHistoryApply: textActions.applyHistory,
    onTextRedo: textActions.redo,
    onTextUndo: textActions.undo,
    onUpdate: blockActions.update,
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
