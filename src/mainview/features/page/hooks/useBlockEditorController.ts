import {
  useRef,
  type DragEvent,
  type InputEvent as ReactInputEvent
} from "react";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import { useKeyboardShortcuts } from "@/mainview/features/commands/useKeyboardShortcuts";
import { useBlockTextEditing } from "@/mainview/features/page/hooks/useBlockTextEditing";
import { BLOCK_EDITOR_COMMANDS } from "@/mainview/features/page/lib/blockEditorCommands";
import { getBlockDepth } from "@/mainview/features/page/lib/blockEditingBehavior";
import { getDropPlacement } from "@/mainview/features/page/web/blockDragDom";
import { getCursorTextOffset } from "@/mainview/features/page/web/domSelection";
import type { BlockEditorProps } from "@/mainview/features/page/types/blockEditorTypes";

export function useBlockEditorController({
  block,
  blockIndex,
  blocksCount,
  isCommandShellSelected,
  maxIndentDepth,
  numberedListMarker,
  numberedListStartAfterIndent,
  numberedListStartAfterOutdent,
  onCreateAfter,
  onCreatePageLink,
  onDelete,
  onDragOver,
  onDragStart,
  onDrop,
  onFocusNext,
  onFocusPrevious,
  onMergeWithPrevious,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdate,
  openSearch,
  previousBlock
}: BlockEditorControllerOptions) {
  const editableRef = useRef<HTMLDivElement>(null);
  const keybindings = useKeybindingStore((state) => state.keybindings);
  const checked = Boolean(block.props.checked);
  const textEditing = useBlockTextEditing({
    block,
    blockIndex,
    blocksCount,
    checked,
    editableRef,
    onTextDraftChange,
    onTextDraftFlush,
    onCreateBlockAfter: onCreateAfter,
    onCreatePageLink,
    onDeleteBlock: onDelete,
    onTextHistoryApply,
    onTextRedo,
    onTextUndo,
    onUpdate
  });
  const { handleKeyDown } = useKeyboardShortcuts({
    activeScopes: textEditing.isCommandMenuOpen
      ? ["global", "editor", "block", "commandMenu"]
      : ["global", "editor", "block"],
    commands: BLOCK_EDITOR_COMMANDS,
    context: {
      applyInlineFormat: textEditing.applyInlineFormat,
      applySelectedCommand: textEditing.applySelectedCommand,
      block,
      blocksCount,
      closeCommandMenu: textEditing.closeCommandMenu,
      commitDraft: textEditing.commitDraft,
      draft: textEditing.draft,
      draftProps: textEditing.draftProps,
      getCursorOffset: () =>
        editableRef.current ? getCursorTextOffset(editableRef.current) : null,
      isCommandMenuOpen: textEditing.isCommandMenuOpen,
      maxIndentDepth,
      numberedListMarker,
      numberedListStartAfterIndent,
      numberedListStartAfterOutdent,
      onCreateAfter,
      onDelete,
      onFocusNext,
      onFocusPrevious,
      onMergeWithPrevious,
      onUpdate,
      openSearch,
      previousBlock,
      redoTextDraft: textEditing.redoTextDraft,
      selectNextCommand: textEditing.selectNextCommand,
      selectPreviousCommand: textEditing.selectPreviousCommand,
      undoTextDraft: textEditing.undoTextDraft
    },
    keybindings
  });

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    onDragOver(block, getDropPlacement(event.clientY, event.currentTarget));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    onDrop(block, getDropPlacement(event.clientY, event.currentTarget));
  }

  function handleBeforeInput(event: ReactInputEvent<HTMLDivElement>) {
    const inputType = event.nativeEvent.inputType;

    if (inputType !== "historyUndo" && inputType !== "historyRedo") {
      return;
    }

    event.preventDefault();
    void applyHistoryInput(inputType);
  }

  function handleHistoryInput(inputType: "historyRedo" | "historyUndo") {
    void applyHistoryInput(inputType);
  }

  function handleShellDragStart(event: DragEvent<HTMLDivElement>) {
    if (!isCommandShellSelected) {
      event.preventDefault();
      return;
    }

    onDragStart(block, event);
  }

  async function applyHistoryInput(inputType: "historyRedo" | "historyUndo") {
    await textEditing.commitDraft();
    await (inputType === "historyUndo"
      ? textEditing.undoTextDraft()
      : textEditing.redoTextDraft());
  }

  return {
    checked,
    depth: getBlockDepth(block),
    editableRef,
    handleBeforeInput,
    handleDragOver,
    handleDrop,
    handleHistoryInput,
    handleKeyDown,
    handleShellDragStart,
    textEditing
  };
}

type BlockEditorControllerOptions = Pick<
  BlockEditorProps,
  | "block"
  | "blockIndex"
  | "blocksCount"
  | "maxIndentDepth"
  | "numberedListMarker"
  | "numberedListStartAfterIndent"
  | "numberedListStartAfterOutdent"
  | "onCreateAfter"
  | "onCreatePageLink"
  | "onDelete"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
  | "onFocusNext"
  | "onFocusPrevious"
  | "onMergeWithPrevious"
  | "onTextDraftChange"
  | "onTextDraftFlush"
  | "onTextHistoryApply"
  | "onTextRedo"
  | "onTextUndo"
  | "onUpdate"
  | "openSearch"
  | "previousBlock"
> & {
  isCommandShellSelected: boolean;
};
