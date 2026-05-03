import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { PageBlockList } from "./PageBlockList";
import { BlockSelectionGroupRect } from "./BlockSelectionGroupRect";
import { BlockSelectionRect } from "./BlockSelectionRect";
import { BlockDragPreview } from "./BlockDragPreview";
import { BlockDropIndicator } from "./BlockDropIndicator";
import { PageTitleEditor } from "./PageTitleEditor";
import { SearchBar } from "./SearchBar";
import { usePageEditorController } from "@/mainview/features/page/hooks/usePageEditorController";
import { usePageSearch } from "@/mainview/features/page/hooks/usePageSearch";
import type { PageEditorProps } from "@/mainview/features/page/types/pageEditorTypes";

export function PageEditor({
  document,
  onCreateBlockAfter,
  onCreatePageLink,
  onDeleteBlock,
  onDeleteBlocks,
  onDuplicateBlocks,
  onPasteBlocks,
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onIndentBlocks,
  onMergeBlockWithPrevious,
  onMoveBlocks,
  onPasteMarkdown,
  onOpenPageLink,
  onRestorePageLink,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdateBlock,
  onUpdatePageTitle,
  pages
}: PageEditorProps) {
  const search = usePageSearch();
  const {
    blockDragActions,
    blockEditorActions,
    blockSelectionState,
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
  } = usePageEditorController({
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
    openSearch: search.openSearch
  });

  return (
    <div
      className="flex h-full w-full flex-col"
      onClick={handleEditorClick}
      onMouseDown={handleEditorMouseDown}
      role="presentation"
    >
      {search.active && (
        <SearchBar
          activeIndex={search.activeIndex}
          matchCount={search.matches.length}
          query={search.query}
          replaceQuery={search.replaceQuery}
          showReplace={search.showReplace}
          onClose={search.closeSearch}
          onGoNext={search.goNext}
          onGoPrevious={search.goPrevious}
          onQueryChange={(query) => search.setQuery(query, document.blocks)}
          onReplace={() => {}}
          onReplaceAll={() => {}}
          onReplaceQueryChange={search.setReplaceQuery}
          onToggleReplace={search.toggleReplace}
        />
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex min-h-full w-full max-w-230 flex-col px-10 py-8">
          <PageTitleEditor
            onFocusFirstBlock={onFocusFirstBlock}
            onUpdatePageTitle={onUpdatePageTitle}
            page={document.page}
            ref={titleRef}
          />
          <div className="grid min-h-full gap-0.5 pb-20 pl-10" role="presentation">
            <BlockSelectionRect box={selectionBox} />
            <BlockDragPreview blocks={document.blocks} preview={dragPreview} />
            <BlockDropIndicator dropTarget={dropTarget} />
            <BlockSelectionGroupRect
              blockIds={selectedBlockIds}
              isDragging={Boolean(blockSelectionState.draggedBlockId)}
              onDragEnd={clearDragState}
              onDragStart={handleSelectedBlocksDragStart}
            />
            <PageBlockList
              document={document}
              dragActions={blockDragActions}
              editorActions={blockEditorActions}
              selectionState={blockSelectionState}
              searchMatches={search.active ? search.matches : undefined}
              searchActiveIndex={search.activeIndex}
              onFocusPreviousBlock={focusPreviousBlock}
              pages={pages}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
