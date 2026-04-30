import { useEffect } from "react";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import type { Block, Page, PageDocument } from "@/shared/contracts";
import { PageBlockList } from "./PageBlockList";
import { BlockSelectionGroupRect } from "./BlockSelectionGroupRect";
import { BlockSelectionRect } from "./BlockSelectionRect";
import { BlockDragPreview } from "./BlockDragPreview";
import { BlockDropIndicator } from "./BlockDropIndicator";
import { PageTitleEditor } from "./PageTitleEditor";
import { useBlockDragState } from "@/mainview/features/page/hooks/useBlockDragState";
import { useInputMode } from "@/mainview/features/page/hooks/useInputMode";
import { useLastBlockFocus } from "@/mainview/features/page/hooks/useLastBlockFocus";
import { usePageEditorInteractions } from "@/mainview/features/page/hooks/usePageEditorInteractions";
import { useSelectedBlockShortcuts } from "@/mainview/features/page/hooks/useSelectedBlockShortcuts";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";
import { clearEditableFocusForBlockSelection } from "@/mainview/features/page/web/blockSelectionFocus";
import type {
  BlockEditorUpdate,
  CreateBlockOptions,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";

type PageEditorProps = {
  document: PageDocument;
  onCreateBlockAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onPasteBlocks: (afterBlock: Block) => Promise<void> | void;
  onFocusNextBlock: (block: Block) => void;
  onFocusFirstBlock: () => void;
  onFocusPreviousBlock: (block: Block) => void;
  onMergeBlockWithPrevious: (
    previousBlock: Block,
    block: Block,
    text: string,
    props: Block["props"]
  ) => Promise<void> | void;
  onMoveBlocks: (blocks: Block[], afterBlockId: string | null) => Promise<void> | void;
  onPasteMarkdown: PasteMarkdownHandler;
  onTextDraftChange: TextDraftChangeHandler;
  onTextDraftFlush: TextDraftFlushHandler;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<Block | null>;
  onTextUndo: (block: Block) => Promise<Block | null>;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
  onUpdatePageTitle: (page: Page, title: string) => void;
};

type PasteMarkdownHandler = (
  block: Block,
  markdown: string,
  editableElement: HTMLElement,
  selection: TextSelectionOffsets
) => Promise<void> | void;
type TextDraftChangeHandler = (block: Block, text: string, props?: Block["props"]) => void;
type TextDraftFlushHandler = (block: Block, text: string, props?: Block["props"]) => Promise<void>;

export function PageEditor({
  document,
  onCreateBlockAfter,
  onDeleteBlock,
  onDeleteBlocks,
  onDuplicateBlocks,
  onPasteBlocks,
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onMergeBlockWithPrevious,
  onMoveBlocks,
  onPasteMarkdown,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdateBlock,
  onUpdatePageTitle
}: PageEditorProps) {
  useInputMode();
  const focusLastBlock = useLastBlockFocus({ document, onCreateBlockAfter });
  const {
    beginBlockSelectionDrag,
    clearBlockSelection,
    clearDragState,
    consumeCompletedBlockRangeSelection,
    draggedBlockId, dragPreview, dropBlock, dropTarget,
    isBlockRangeSelecting,
    pressBlockDragHandle,
    selectedBlockIds, selectionBox, setDropPlacement, startDrag
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

  useSelectedBlockShortcuts({
    clearSelection: clearBlockSelection,
    document,
    onDeleteBlocks,
    onDuplicateBlocks,
    onPasteBlocks,
    selectedBlocks
  });

  useEffect(() => {
    clearEditableFocusForBlockSelection(selectedBlockIds);
  }, [selectedBlockIds]);

  return (
    <div
      className="flex h-full w-full flex-col px-10 py-8"
      onClick={handleEditorClick}
      onMouseDown={handleEditorMouseDown}
      role="presentation"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-230 flex-1 flex-col">
        <PageTitleEditor
          onFocusFirstBlock={onFocusFirstBlock}
          onUpdatePageTitle={onUpdatePageTitle}
          page={document.page}
          ref={titleRef}
        />

        <ScrollArea className="min-h-0 flex-1">
          <div className="grid min-h-full gap-0.5 pb-20 pl-10" role="presentation">
            <BlockSelectionRect box={selectionBox} />
            <BlockDragPreview blocks={document.blocks} preview={dragPreview} />
            <BlockDropIndicator dropTarget={dropTarget} />
            <BlockSelectionGroupRect
              blockIds={selectedBlockIds}
              isDragging={Boolean(draggedBlockId)}
              onDragEnd={clearDragState}
              onDragStart={handleSelectedBlocksDragStart}
            />
            <PageBlockList
              document={document}
              draggedBlockId={draggedBlockId}
              isBlockRangeSelecting={isBlockRangeSelecting}
              onCreateBlockAfter={onCreateBlockAfter}
              onDeleteBlock={onDeleteBlock}
              onDragEnd={clearDragState}
              onDragOver={setDropPlacement}
              onDragStart={startDrag}
              onDragPointerDown={pressBlockDragHandle}
              onDrop={dropBlock}
              onFocusNextBlock={onFocusNextBlock}
              onFocusPreviousBlock={focusPreviousBlock}
              onMergeBlockWithPrevious={onMergeBlockWithPrevious}
              onPasteMarkdown={onPasteMarkdown}
              selectedBlockIds={selectedBlockIds}
              onTextDraftChange={onTextDraftChange}
              onTextDraftFlush={onTextDraftFlush}
              onTextHistoryApply={onTextHistoryApply}
              onTextRedo={onTextRedo}
              onTextUndo={onTextUndo}
              onUpdateBlock={onUpdateBlock}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
