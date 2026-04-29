import { DragEvent, useRef } from "react";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import { useKeyboardShortcuts } from "@/mainview/features/commands/useKeyboardShortcuts";
import { cn } from "@/mainview/lib/utils";
import { BlockBody } from "./BlockBody";
import { BlockCommandMenu } from "./BlockCommandMenu";
import { BlockDragHandle } from "./BlockDragHandle";
import { BlockDropIndicator } from "./BlockDropIndicator";
import { useBlockTextEditing } from "../hooks/useBlockTextEditing";
import { getBlockDepth } from "../lib/blockEditingBehavior";
import { getDropPlacement } from "../lib/blockDrag";
import { BLOCK_EDITOR_COMMANDS } from "../lib/blockEditorCommands";
import type { BlockEditorProps } from "../types/blockEditorTypes";

export function BlockEditor({
  block,
  blockIndex,
  blocksCount,
  isDragging,
  isDropAfter,
  isDropBefore,
  isBlockRangeSelecting,
  isSelected,
  maxIndentDepth,
  numberedListMarker,
  numberedListStartAfterIndent,
  numberedListStartAfterOutdent,
  onCreateAfter,
  onDelete,
  onDragEnd,
  onDragOver,
  onDragPointerDown,
  onDragStart,
  onDrop,
  onFocusNext,
  onFocusPrevious,
  onPasteMarkdown,
  onSelect,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdate
}: BlockEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const keybindings = useKeybindingStore((state) => state.keybindings);
  const checked = Boolean(block.props.checked);
  const {
    applyCommand,
    applyInlineFormat,
    applySelectedCommand,
    changeDraft,
    closeCommandMenu,
    commitDraft,
    draft,
    isCommandMenuOpen,
    selectedCommandIndex,
    selectNextCommand,
    selectPreviousCommand,
    setSelectedCommandIndex,
    syncActiveInlineMarksFromSelection,
    redoTextDraft,
    undoTextDraft,
    visibleCommands
  } = useBlockTextEditing({
    block,
    checked,
    editableRef,
    onTextDraftChange,
    onTextDraftFlush,
    onCreateBlockAfter: onCreateAfter,
    onTextHistoryApply,
    onTextRedo,
    onTextUndo,
    onUpdate
  });
  const depth = getBlockDepth(block);
  const { handleKeyDown } = useKeyboardShortcuts({
    activeScopes: isCommandMenuOpen
      ? ["global", "editor", "block", "commandMenu"]
      : ["global", "editor", "block"],
    commands: BLOCK_EDITOR_COMMANDS,
    context: {
      applySelectedCommand,
      applyInlineFormat,
      block,
      blocksCount,
      closeCommandMenu,
      commitDraft,
      draft,
      isCommandMenuOpen,
      maxIndentDepth,
      numberedListMarker,
      numberedListStartAfterIndent,
      numberedListStartAfterOutdent,
      onCreateAfter,
      onDelete,
      onFocusNext,
      onFocusPrevious,
      onUpdate,
      redoTextDraft,
      selectNextCommand,
      selectPreviousCommand,
      undoTextDraft
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

  function handleShellDragStart(event: DragEvent<HTMLDivElement>) {
    if (!isSelected) {
      event.preventDefault();
      return;
    }

    onDragStart(block, event);
  }

  return (
    <div
      className={cn(
        "block-editor-shell group relative rounded-md py-px",
        block.type === "quote" && "block-editor-quote bg-muted/30",
        isBlockRangeSelecting && "select-none",
        isDragging && "opacity-50"
      )}
      data-block-id={block.id}
      draggable={isSelected && !isDragging}
      onDragOver={handleDragOver}
      onDragStart={handleShellDragStart}
      onDragEnd={onDragEnd}
      onDrop={handleDrop}
      style={{ marginLeft: depth * 24 }}
    >
      <BlockDropIndicator
        isDropAfter={isDropAfter}
        isDropBefore={isDropBefore}
      />
      <BlockDragHandle
        block={block}
        onDragEnd={onDragEnd}
        onDragPointerDown={onDragPointerDown}
        onDragStart={onDragStart}
        onSelect={onSelect}
      />

      <div className="min-w-0">
        <BlockBody
          block={block}
          blockIndex={blockIndex}
          checked={checked}
          draft={draft}
          isSelected={isSelected}
          numberedListMarker={numberedListMarker}
          onApplyCommand={applyCommand}
          onBlur={commitDraft}
          onChange={changeDraft}
          onDragStart={handleShellDragStart}
          onKeyDown={handleKeyDown}
          onPasteMarkdown={onPasteMarkdown}
          onSelectionChange={syncActiveInlineMarksFromSelection}
          onUpdate={onUpdate}
          editableRef={editableRef}
        />

        {isCommandMenuOpen ? (
          <BlockCommandMenu
            activeIndex={selectedCommandIndex}
            anchorRef={editableRef}
            commands={visibleCommands}
            onActiveIndexChange={setSelectedCommandIndex}
            onSelect={applyCommand}
          />
        ) : null}
      </div>
    </div>
  );
}
