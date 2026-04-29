import type { Block, PageDocument } from "../../../../shared/contracts";
import { BlockEditor } from "./BlockEditor";
import type { CreateBlockDraft } from "../lib/blockEditingBehavior";
import {
  getMaxIndentDepth,
  getNumberedListStartAfterDepthChange
} from "../lib/blockIndentTargets";
import { getNumberedListMarkers } from "../lib/blockNumbering";
import type {
  BlockEditorUpdate,
  TextSelectionOffsets
} from "../types/blockEditorTypes";

type PageBlockListProps = {
  document: PageDocument;
  draggedBlockId: string | null;
  dropTarget: { blockId: string; placement: "before" | "after" } | null;
  isBlockRangeSelecting: boolean;
  onCreateBlockAfter: (block: Block, draft?: CreateBlockDraft) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onDragEnd: () => void;
  onDragOver: (block: Block, placement: "before" | "after") => void;
  onDragPointerDown: (block: Block, event: React.PointerEvent<HTMLElement>) => void;
  onDragStart: (block: Block, event?: React.DragEvent<HTMLElement>) => void;
  onDrop: (block: Block, placement: "before" | "after") => void;
  onFocusNextBlock: (block: Block) => void;
  onFocusPreviousBlock: (block: Block, blockIndex: number) => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onSelectBlock: (block: Block, event?: React.MouseEvent) => void;
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
  dropTarget,
  isBlockRangeSelecting,
  onCreateBlockAfter,
  onDeleteBlock,
  onDragEnd,
  onDragOver,
  onDragPointerDown,
  onDragStart,
  onDrop,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onPasteMarkdown,
  onSelectBlock,
  selectedBlockIds,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdateBlock
}: PageBlockListProps) {
  const numberedListMarkers = getNumberedListMarkers(document.blocks);

  return (
    <>
      {document.blocks.map((block, blockIndex) => (
        <BlockEditor
          block={block}
          blockIndex={blockIndex}
          blocksCount={document.blocks.length}
          isDragging={draggedBlockId === block.id}
          isDropAfter={isBlockDropTarget(dropTarget, block, "after")}
          isDropBefore={isBlockDropTarget(dropTarget, block, "before")}
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
          onCreateAfter={onCreateBlockAfter}
          onDelete={onDeleteBlock}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDragPointerDown={onDragPointerDown}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onFocusNext={onFocusNextBlock}
          onFocusPrevious={(target) => onFocusPreviousBlock(target, blockIndex)}
          onPasteMarkdown={onPasteMarkdown}
          onSelect={onSelectBlock}
          onTextDraftChange={onTextDraftChange}
          onTextDraftFlush={onTextDraftFlush}
          onTextHistoryApply={onTextHistoryApply}
          onTextRedo={onTextRedo}
          onTextUndo={onTextUndo}
          onUpdate={onUpdateBlock}
        />
      ))}
    </>
  );
}

function isBlockDropTarget(
  dropTarget: { blockId: string; placement: "before" | "after" } | null,
  block: Block,
  placement: "before" | "after"
) {
  return dropTarget?.blockId === block.id && dropTarget.placement === placement;
}
