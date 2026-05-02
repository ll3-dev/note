import { useEffect, useRef } from "react";
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
import { focusEditableBlockById } from "@/mainview/features/page/web/blockFocusDom";
import { scrollBlockIntoView } from "@/mainview/features/page/web/blockScroll";
import type {
  BlockEditorActions,
  BlockEditorDragActions,
  BlockEditorUpdate,
  CreateBlockOptions,
  OpenPageLinkOptions,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";

type PageEditorProps = {
  document: PageDocument;
  onCreateBlockAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onCreatePageLink: (block: Block) => Promise<void> | void;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onPasteBlocks: (afterBlock: Block) => Promise<Block[]> | Block[];
  onFocusNextBlock: (block: Block) => boolean;
  onFocusFirstBlock: () => void;
  onFocusPreviousBlock: (block: Block) => boolean;
  onIndentBlocks: (blocks: Array<{ block: Block; props: Block["props"] }>) => void;
  onMergeBlockWithPrevious: (
    previousBlock: Block,
    block: Block,
    text: string,
    props: Block["props"]
  ) => Promise<void> | void;
  onMoveBlocks: (blocks: Block[], afterBlockId: string | null) => Promise<void> | void;
  onPasteMarkdown: PasteMarkdownHandler;
  onOpenPageLink: (pageId: string, options?: OpenPageLinkOptions) => void;
  onRestorePageLink: (pageId: string) => void;
  onTextDraftChange: TextDraftChangeHandler;
  onTextDraftFlush: TextDraftFlushHandler;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<Block | null>;
  onTextUndo: (block: Block) => Promise<Block | null>;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
  onUpdatePageTitle: (page: Page, title: string) => void;
  pages: Page[];
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
    selectionAnchorBlockId,
    selectionFocusBlockId,
    applyKeyboardBlockSelection,
    setBlockSelection,
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
  const clearBlockSelectionRef = useRef(clearBlockSelection);

  useEffect(() => {
    clearBlockSelectionRef.current = clearBlockSelection;
  }, [clearBlockSelection]);

  useSelectedBlockShortcuts({
    clearSelection: clearBlockSelection,
    document,
    onDeleteBlocks,
    onDuplicateBlocks,
    onFocusBlock: focusEditableBlockById,
    onFocusTitle: () => titleRef.current?.focus(),
    onIndentBlocks,
    onKeyboardSelection: applyKeyboardBlockSelection,
    onMoveBlocks,
    onPasteBlocks,
    selectionAnchorBlockId,
    selectionFocusBlockId,
    setSelection: setBlockSelection,
    selectedBlocks
  });

  useEffect(() => {
    clearEditableFocusForBlockSelection(selectedBlockIds);
  }, [selectedBlockIds]);

  useEffect(() => {
    if (selectedBlockIds.length === 0) {
      return;
    }

    function handleHistoryCommand() {
      clearBlockSelection();
    }

    window.addEventListener("note-history-command", handleHistoryCommand);

    return () => {
      window.removeEventListener("note-history-command", handleHistoryCommand);
    };
  }, [clearBlockSelection, selectedBlockIds.length]);

  useEffect(() => {
    function handleClearBlockSelection() {
      clearBlockSelectionRef.current();
    }

    window.addEventListener("note-clear-block-selection", handleClearBlockSelection);

    return () => {
      window.removeEventListener(
        "note-clear-block-selection",
        handleClearBlockSelection
      );
    };
  }, []);

  useEffect(() => {
    scrollBlockIntoView(selectionFocusBlockId);
  }, [selectionFocusBlockId]);

  const blockEditorActions = {
    onCreateAfter: onCreateBlockAfter,
    onCreatePageLink,
    onDelete: onDeleteBlock,
    onFocusNext: onFocusNextBlock,
    onFocusPrevious: focusPreviousBlock,
    onMergeWithPrevious: onMergeBlockWithPrevious,
    onOpenPageLink,
    onPasteMarkdown,
    onRestorePageLink,
    onTextDraftChange,
    onTextDraftFlush,
    onTextHistoryApply,
    onTextRedo,
    onTextUndo,
    onUpdate: onUpdateBlock
  } satisfies BlockEditorActions;
  const blockDragActions = {
    onDragEnd: clearDragState,
    onDragOver: setDropPlacement,
    onDragPointerDown: pressBlockDragHandle,
    onDragStart: startDrag,
    onDrop: dropBlock
  } satisfies BlockEditorDragActions;
  const blockSelectionState = {
    draggedBlockId,
    isBlockRangeSelecting,
    selectedBlockIds
  };

  return (
    <div
      className="flex h-full w-full flex-col"
      onClick={handleEditorClick}
      onMouseDown={handleEditorMouseDown}
      role="presentation"
    >
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
              isDragging={Boolean(draggedBlockId)}
              onDragEnd={clearDragState}
              onDragStart={handleSelectedBlocksDragStart}
            />
            <PageBlockList
              document={document}
              dragActions={blockDragActions}
              editorActions={blockEditorActions}
              selectionState={blockSelectionState}
              onFocusPreviousBlock={focusPreviousBlock}
              pages={pages}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
