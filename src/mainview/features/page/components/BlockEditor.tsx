import { cn } from "@/mainview/lib/utils";
import { BlockBody } from "./BlockBody";
import { BlockCommandMenu } from "./BlockCommandMenu";
import { BlockDragHandle } from "./BlockDragHandle";
import { InlineFormattingToolbar } from "./InlineFormattingToolbar";
import { useBlockEditorController } from "@/mainview/features/page/hooks/useBlockEditorController";
import type { BlockEditorProps } from "@/mainview/features/page/types/blockEditorTypes";

export function BlockEditor({
  block,
  blockIndex,
  blocksCount,
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
  onDragStart,
  onDrop,
  onFocusNext,
  onFocusPrevious,
  onMergeWithPrevious,
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
  searchActiveHighlight
}: BlockEditorProps) {
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
    onTextDraftChange,
    onTextDraftFlush,
    onTextHistoryApply,
    onTextRedo,
    onTextUndo,
    onUpdate,
    openSearch,
    previousBlock
  });

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
      <BlockDragHandle
        block={block}
        onDragEnd={onDragEnd}
        onDragPointerDown={onDragPointerDown}
        onDragStart={onDragStart}
      />

      <div className="min-w-0">
        <BlockBody
          block={block}
          blockIndex={blockIndex}
          checked={checked}
          draft={textEditing.draft}
          draftProps={textEditing.draftProps}
          isSelected={isSelected}
          linkedPage={linkedPage}
          numberedListMarker={numberedListMarker}
          onBlur={textEditing.commitDraft}
          onBeforeInput={handleBeforeInput}
          onChange={textEditing.changeDraft}
          onDragStart={handleShellDragStart}
          onHistoryInput={handleHistoryInput}
          onKeyDown={handleKeyDown}
          onOpenPageLink={onOpenPageLink}
          onRestorePageLink={onRestorePageLink}
          onPasteMarkdown={onPasteMarkdown}
          onSelectionChange={textEditing.syncActiveInlineMarksFromSelection}
          onUpdate={onUpdate}
          editableRef={editableRef}
          searchHighlights={searchHighlights}
          searchActiveHighlight={searchActiveHighlight}
        />

        {textEditing.isCommandMenuOpen ? (
          <BlockCommandMenu
            activeIndex={textEditing.selectedCommandIndex}
            anchorRef={editableRef}
            commands={textEditing.visibleCommands}
            onActiveIndexChange={textEditing.setSelectedCommandIndex}
            onSelect={textEditing.applyCommand}
          />
        ) : null}
        <InlineFormattingToolbar
          onFormat={textEditing.applyInlineFormat}
          onLink={textEditing.applyInlineLink}
          rect={textEditing.selectionToolbarRect}
        />
      </div>
    </div>
  );
}
