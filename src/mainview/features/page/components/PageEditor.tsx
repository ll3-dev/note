import { useEffect, useRef, type DragEvent, type MouseEvent } from "react";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import type { Block, Page, PageDocument } from "../../../../shared/contracts";
import { PageBlockList } from "./PageBlockList";
import { BlockSelectionGroupRect } from "./BlockSelectionGroupRect";
import { BlockSelectionRect } from "./BlockSelectionRect";
import { BlockDragPreview } from "./BlockDragPreview";
import { BlockDropIndicator } from "./BlockDropIndicator";
import { PageTitleEditor, type PageTitleEditorHandle } from "./PageTitleEditor";
import { useBlockDragState } from "../hooks/useBlockDragState";
import { useInputMode } from "../hooks/useInputMode";
import { useLastBlockFocus } from "../hooks/useLastBlockFocus";
import { useSelectedBlockShortcuts } from "../hooks/useSelectedBlockShortcuts";
import type { CreateBlockDraft } from "../lib/blockEditingBehavior";
import { clearEditableFocusForBlockSelection } from "../lib/blockSelectionFocus";
import { getNativeTextSelectionBlock } from "../lib/pageSelectionHitTest";
import type { BlockEditorUpdate, TextSelectionOffsets } from "../types/blockEditorTypes";

type PageEditorProps = {
  document: PageDocument;
  onCreateBlockAfter: (block: Block, draft?: CreateBlockDraft) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onFocusNextBlock: (block: Block) => void;
  onFocusFirstBlock: () => void;
  onFocusPreviousBlock: (block: Block) => void;
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
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
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
  const titleRef = useRef<PageTitleEditorHandle>(null);

  const focusLastBlock = useLastBlockFocus({ document, onCreateBlockAfter });
  const {
    beginBlockSelectionDrag,
    clearBlockSelection,
    clearDragState,
    consumeCompletedBlockRangeSelection,
    draggedBlockId, dragPreview, dropBlock, dropTarget,
    isBlockRangeSelecting,
    pressBlockDragHandle,
    selectBlock,
    selectedBlockIds, selectionBox, setDropPlacement, startDrag
  } = useBlockDragState({
    blocks: document.blocks,
    onMoveBlocks
  });

  const selectedBlocks = document.blocks.filter((block) =>
    selectedBlockIds.includes(block.id)
  );

  useSelectedBlockShortcuts({
    clearSelection: clearBlockSelection, document, onDeleteBlocks, selectedBlocks
  });

  useEffect(() => {
    clearEditableFocusForBlockSelection(selectedBlockIds);
  }, [selectedBlockIds]);

  function handleEditorMouseDown(event: MouseEvent<HTMLDivElement>) {
    const nativeTextBlock = getNativeTextSelectionBlock(event);

    if (nativeTextBlock) {
      const selectedBlockId = nativeTextBlock.dataset.blockId;

      if (selectedBlockId && selectedBlockIds.includes(selectedBlockId)) {
        return;
      }

      clearBlockSelection();
      beginBlockSelectionDrag(event, { handoffBlockElement: nativeTextBlock });
      return;
    }

    if (beginBlockSelectionDrag(event)) {
      event.preventDefault();
      return;
    }

    focusLastBlock(event);
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>) {
    if (consumeCompletedBlockRangeSelection()) {
      return;
    }

    if (focusLastBlock(event)) {
      clearBlockSelection();
    }
  }

  function handleSelectedBlocksDragStart(event: DragEvent<HTMLDivElement>) {
    const firstSelectedBlock = selectedBlocks[0];
    if (!firstSelectedBlock) {
      event.preventDefault();
      return;
    }
    startDrag(firstSelectedBlock, event);
  }

  function focusPreviousBlock(block: Block, blockIndex: number) {
    if (blockIndex === 0) {
      titleRef.current?.focus();
    } else {
      onFocusPreviousBlock(block);
    }
  }

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
              onPasteMarkdown={onPasteMarkdown}
              onSelectBlock={selectBlock}
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
