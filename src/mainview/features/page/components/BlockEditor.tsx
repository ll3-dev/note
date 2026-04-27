import { DragEvent, useRef } from "react";
import { useKeybindingStore } from "@/mainview/features/commands/keybindingStore";
import { useKeyboardShortcuts } from "@/mainview/features/commands/useKeyboardShortcuts";
import { cn } from "@/mainview/lib/utils";
import { BlockBody } from "./BlockBody";
import { BlockCommandMenu } from "./BlockCommandMenu";
import { BlockDragHandle } from "./BlockDragHandle";
import { BlockDropIndicator } from "./BlockDropIndicator";
import { useBlockTextEditing } from "../hooks/useBlockTextEditing";
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
  isSelected,
  onCreateAfter,
  onDelete,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onFocusNext,
  onFocusPrevious,
  onSelect,
  onUpdate
}: BlockEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const keybindings = useKeybindingStore((state) => state.keybindings);
  const checked = Boolean(block.props.checked);
  const {
    applyCommand,
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
    visibleCommands
  } = useBlockTextEditing({ block, checked, editableRef, onUpdate });
  const { handleKeyDown } = useKeyboardShortcuts({
    activeScopes: isCommandMenuOpen
      ? ["global", "editor", "block", "commandMenu"]
      : ["global", "editor", "block"],
    commands: BLOCK_EDITOR_COMMANDS,
    context: {
      applySelectedCommand,
      block,
      blocksCount,
      closeCommandMenu,
      commitDraft,
      draft,
      isCommandMenuOpen,
      onCreateAfter,
      onDelete,
      onFocusNext,
      onFocusPrevious,
      selectNextCommand,
      selectPreviousCommand
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

  return (
    <div
      className={cn(
        "block-editor-shell group relative -ml-10 grid grid-cols-[40px_minmax(0,1fr)] rounded-md py-0.5",
        block.type === "quote" && "block-editor-quote bg-muted/30",
        isSelected && "bg-muted/50",
        isDragging && "opacity-50"
      )}
      data-block-id={block.id}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <BlockDropIndicator
        isDropAfter={isDropAfter}
        isDropBefore={isDropBefore}
      />
      <BlockDragHandle
        block={block}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        onSelect={onSelect}
      />

      <div className="min-w-0">
        <BlockBody
          block={block}
          blockIndex={blockIndex}
          checked={checked}
          onApplyCommand={applyCommand}
          onBlur={commitDraft}
          onChange={changeDraft}
          onKeyDown={handleKeyDown}
          onUpdate={onUpdate}
          editableRef={editableRef}
        />

        {isCommandMenuOpen ? (
          <BlockCommandMenu
            activeIndex={selectedCommandIndex}
            commands={visibleCommands}
            onActiveIndexChange={setSelectedCommandIndex}
            onSelect={applyCommand}
          />
        ) : null}
      </div>
    </div>
  );
}
