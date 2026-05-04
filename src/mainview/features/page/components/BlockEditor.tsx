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

      <div
        className={cn(
          "min-w-0",
          isCallout && "rounded-md bg-accent/50 px-3 py-1"
        )}
      >
        {isCallout ? (
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-1 shrink-0 text-lg" role="img" aria-label="callout icon">
              {calloutIcon}
            </span>
            <div className="min-w-0 flex-1">
              {nestedChildren ??
                (legacyCalloutText ? (
                  <div className="min-h-7 whitespace-pre-wrap break-words px-1 py-1.5">
                    {textEditing.draft}
                  </div>
                ) : null)}
            </div>
          </div>
        ) : (
          <>
            <BlockBody
              block={block}
              blockIndex={blockIndex}
              checked={checked}
              draft={textEditing.draft}
              draftProps={textEditing.draftProps}
              isSelected={isSelected}
              linkedPage={linkedPage}
              numberedListMarker={numberedListMarker}
              onApplyInlinePageLink={textEditing.applyInlinePageLinkDraft}
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
            {nestedChildren ? <div className="mt-1 pl-6">{nestedChildren}</div> : null}
          </>
        )}

        {!isCallout && textEditing.isCommandMenuOpen ? (
          <BlockCommandMenu
            activeIndex={textEditing.selectedCommandIndex}
            anchorRef={editableRef}
            commands={textEditing.visibleCommands}
            onActiveIndexChange={textEditing.setSelectedCommandIndex}
            onSelect={textEditing.applyCommand}
          />
        ) : null}
        {!isCallout ? (
          <InlineFormattingToolbar
            onFormat={textEditing.applyInlineFormat}
            onLink={textEditing.applyInlineLink}
            rect={textEditing.selectionToolbarRect}
          />
        ) : null}
      </div>
    </div>
  );
}
