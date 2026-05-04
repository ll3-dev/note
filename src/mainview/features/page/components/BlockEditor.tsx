import { cn } from "@/mainview/lib/utils";
import {
  BlockBody,
  type BlockBodyActions,
  type BlockBodyState
} from "./BlockBody";
import {
  BlockDragHandleSlot,
  BlockEditorFloatingControls,
  CalloutBlockContent
} from "./BlockEditorParts";
import { useBlockEditorController } from "@/mainview/features/page/hooks/useBlockEditorController";
import type { BlockEditorProps } from "@/mainview/features/page/types/blockEditorTypes";
import type { MouseEvent } from "react";

export function BlockEditor({
  block,
  blockIndex,
  blocksCount,
  dragHandleVisibility,
  isDragging,
  isBlockRangeSelecting,
  isSelected,
  maxIndentDepth,
  numberedListMarker,
  numberedListStartAfterIndent,
  numberedListStartAfterOutdent,
  linkedPage,
  previousBlock,
  onCreateAfter,
  onDelete,
  onDragEnd,
  onDragOver,
  onDragPointerDown,
  onSelectBlock,
  onDragStart,
  onDrop,
  onFocusNext,
  onFocusPrevious,
  onMergeWithPrevious,
  onMoveOutOfParent,
  onPasteMarkdown,
  onCreatePageLink,
  onOpenPageLink,
  onRestorePageLink,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdate,
  openSearch,
  searchHighlights,
  searchActiveHighlight,
  nestedChildren
}: BlockEditorProps) {
  const isCallout = block.type === "callout";
  const {
    checked,
    depth,
    editableRef,
    handleBeforeInput,
    handleDragOver,
    handleDrop,
    handleHistoryInput,
    handleKeyDown,
    handleShellDragStart,
    textEditing
  } = useBlockEditorController({
    block,
    blockIndex,
    blocksCount,
    isCommandShellSelected: isSelected,
    maxIndentDepth,
    numberedListMarker,
    numberedListStartAfterIndent,
    numberedListStartAfterOutdent,
    onCreatePageLink,
    onCreateAfter,
    onDelete,
    onDragOver,
    onDragStart,
    onDrop,
    onFocusNext,
    onFocusPrevious,
    onMergeWithPrevious,
    onMoveOutOfParent,
    onTextDraftChange,
    onTextDraftFlush,
    onTextHistoryApply,
    onTextRedo,
    onTextUndo,
    onUpdate,
    openSearch,
    previousBlock
  });
  const calloutIcon =
    typeof textEditing.draftProps.icon === "string" ? textEditing.draftProps.icon : "💡";
  const legacyCalloutText = textEditing.draft.trim();
  const blockBodyState: BlockBodyState = {
    block,
    blockIndex,
    checked,
    draft: textEditing.draft,
    draftProps: textEditing.draftProps,
    editableRef,
    isSelected,
    linkedPage,
    numberedListMarker,
    searchActiveHighlight,
    searchHighlights
  };
  const blockBodyActions: BlockBodyActions = {
    onApplyInlinePageLink: textEditing.applyInlinePageLinkDraft,
    onBeforeInput: handleBeforeInput,
    onBlur: textEditing.commitDraft,
    onChange: textEditing.changeDraft,
    onDragStart: handleShellDragStart,
    onHistoryInput: handleHistoryInput,
    onKeyDown: handleKeyDown,
    onOpenPageLink,
    onPasteMarkdown,
    onRestorePageLink,
    onSelectionChange: textEditing.syncActiveInlineMarksFromSelection,
    onUpdate
  };

  function handleShellMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!isCallout || !(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest("[data-block-id]") !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    onSelectBlock(block);
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
      onMouseDown={handleShellMouseDown}
      role="presentation"
      style={{ marginLeft: depth * 24 }}
    >
      <BlockDragHandleSlot
        block={block}
        dragHandleVisibility={dragHandleVisibility}
        onDragEnd={onDragEnd}
        onDragPointerDown={onDragPointerDown}
        onDragStart={onDragStart}
        onSelectBlock={onSelectBlock}
      />

      <div
        className={cn(
          "min-w-0",
          isCallout && "rounded-md bg-accent/50 px-3 py-1"
        )}
      >
        {isCallout ? (
          <CalloutBlockContent
            icon={calloutIcon}
            legacyText={legacyCalloutText}
            nestedChildren={nestedChildren}
          />
        ) : (
          <>
            <BlockBody
              actions={blockBodyActions}
              state={blockBodyState}
            />
            {nestedChildren ? <div className="mt-1 pl-6">{nestedChildren}</div> : null}
          </>
        )}

        <BlockEditorFloatingControls
          anchorRef={editableRef}
          isCallout={isCallout}
          textEditing={textEditing}
        />
      </div>
    </div>
  );
}
