import { Trash2 } from "lucide-react";
import { DragEvent, KeyboardEvent, useRef } from "react";
import { Button } from "@/mainview/components/ui/button";
import { cn } from "@/mainview/lib/utils";
import { BlockBody } from "./BlockBody";
import { BlockCommandMenu } from "./BlockCommandMenu";
import { BlockDragHandle } from "./BlockDragHandle";
import { BlockDropIndicator } from "./BlockDropIndicator";
import { useBlockTextEditing } from "../hooks/useBlockTextEditing";
import { getDropPlacement } from "../lib/blockDrag";
import type { BlockEditorProps } from "../types/blockEditorTypes";

export function BlockEditor({
  block,
  blockIndex,
  blocksCount,
  isDragging,
  isDeleting,
  isDropAfter,
  isDropBefore,
  isSelected,
  onCreateAfter,
  onDelete,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onFocusPrevious,
  onSelect,
  onUpdate
}: BlockEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const checked = Boolean(block.props.checked);
  const {
    applyCommand,
    changeDraft,
    closeCommandMenu,
    commitDraft,
    draft,
    isCommandMenuOpen,
    visibleCommands
  } = useBlockTextEditing({ block, checked, editableRef, onUpdate });

  async function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commitDraft();
      await onCreateAfter(block);
      return;
    }

    if (event.key === "Backspace" && draft.length === 0 && blocksCount > 1) {
      event.preventDefault();
      onFocusPrevious(block);
      onDelete(block);
      return;
    }

    if (event.key === "Escape" && isCommandMenuOpen) {
      event.preventDefault();
      closeCommandMenu();
    }
  }

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
        "block-editor-shell group relative grid grid-cols-[28px_minmax(0,1fr)_32px] items-start gap-1 rounded-md px-1 py-0.5 hover:bg-muted/60",
        block.type === "quote" && "block-editor-quote bg-muted/30",
        isSelected && "bg-muted/70 ring-1 ring-border",
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
          onKeyDown={(event) => void handleKeyDown(event)}
          onUpdate={onUpdate}
          editableRef={editableRef}
        />

        {isCommandMenuOpen ? (
          <BlockCommandMenu
            commands={visibleCommands}
            onSelect={applyCommand}
          />
        ) : null}
      </div>

      <Button
        aria-label="block 삭제"
        className="block-hover-action opacity-0 transition-opacity group-hover:opacity-100"
        disabled={isDeleting || blocksCount <= 1}
        onClick={() => onDelete(block)}
        size="icon-sm"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
