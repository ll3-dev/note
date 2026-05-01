import type { Block, PageDocument } from "@/shared/contracts";
import { BlockEditor } from "./BlockEditor";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";
import {
  getMaxIndentDepth,
  getNumberedListStartAfterDepthChange
} from "@/mainview/features/page/lib/blockIndentTargets";
import { getNumberedListMarkers } from "@/mainview/features/page/lib/blockNumbering";
import { getVisibleBlocks } from "@/mainview/features/page/lib/blockTree";
import type {
  BlockEditorUpdate,
  CreateBlockOptions,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";

type PageBlockListProps = {
  document: PageDocument;
  draggedBlockId: string | null;
  isBlockRangeSelecting: boolean;
  onCreateBlockAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onCreatePageLink: (block: Block, query: string) => Promise<void> | void;
  onDragEnd: () => void;
  onDragOver: (block: Block, placement: "before" | "after") => void;
  onDragPointerDown: (block: Block, event: React.PointerEvent<HTMLElement>) => void;
  onDragStart: (block: Block, event?: React.DragEvent<HTMLElement>) => void;
  onDrop: (block: Block, placement: "before" | "after") => void;
  onFocusNextBlock: (block: Block) => void;
  onFocusPreviousBlock: (block: Block, blockIndex: number) => void;
  onMergeBlockWithPrevious: (
    previousBlock: Block,
    block: Block,
    text: string,
    props: Block["props"]
  ) => Promise<void> | void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onOpenPageLink: (pageId: string) => void;
  selectedBlockIds: string[];
  onTextDraftChange: (
    block: Block,
    text: string,
    props?: Block["props"]
  ) => void;
  onTextDraftFlush: (
    block: Block,
    text: string,
    props?: Block["props"]
  ) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<Block | null>;
  onTextUndo: (block: Block) => Promise<Block | null>;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
};

export function PageBlockList({
  document,
  draggedBlockId,
  isBlockRangeSelecting,
  onCreateBlockAfter,
  onCreatePageLink,
  onDeleteBlock,
  onDragEnd,
  onDragOver,
  onDragPointerDown,
  onDragStart,
  onDrop,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onMergeBlockWithPrevious,
  onPasteMarkdown,
  onOpenPageLink,
  selectedBlockIds,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdateBlock
}: PageBlockListProps) {
  const numberedListMarkers = getNumberedListMarkers(document.blocks);
  const visibleBlocks = getVisibleBlocks(document.blocks);

  return (
    <>
      {visibleBlocks.map((block) => {
        const blockIndex = document.blocks.findIndex((item) => item.id === block.id);

        return (
          <BlockEditor
            block={block}
            blockIndex={blockIndex}
            blocksCount={document.blocks.length}
            isDragging={draggedBlockId === block.id}
            isBlockRangeSelecting={isBlockRangeSelecting}
            isSelected={selectedBlockIds.includes(block.id)}
            key={block.id}
            maxIndentDepth={getMaxIndentDepth(document.blocks, blockIndex)}
            numberedListMarker={numberedListMarkers.get(block.id) ?? null}
            numberedListStartAfterIndent={getNumberedListStartAfterDepthChange(
              document.blocks,
              blockIndex,
              "in",
              numberedListMarkers
            )}
            numberedListStartAfterOutdent={getNumberedListStartAfterDepthChange(
              document.blocks,
              blockIndex,
              "out",
              numberedListMarkers
            )}
            previousBlock={document.blocks[blockIndex - 1] ?? null}
            onCreateAfter={onCreateBlockAfter}
            onCreatePageLink={onCreatePageLink}
            onDelete={onDeleteBlock}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragPointerDown={onDragPointerDown}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onFocusNext={onFocusNextBlock}
            onFocusPrevious={(target) => onFocusPreviousBlock(target, blockIndex)}
            onMergeWithPrevious={onMergeBlockWithPrevious}
            onPasteMarkdown={onPasteMarkdown}
            onOpenPageLink={onOpenPageLink}
            onTextDraftChange={onTextDraftChange}
            onTextDraftFlush={onTextDraftFlush}
            onTextHistoryApply={onTextHistoryApply}
            onTextRedo={onTextRedo}
            onTextUndo={onTextUndo}
            onUpdate={onUpdateBlock}
          />
        );
      })}
    </>
  );
}
