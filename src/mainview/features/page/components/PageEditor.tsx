import { useRef } from "react";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import type { Block, Page, PageDocument } from "../../../../shared/contracts";
import { BlockEditor } from "./BlockEditor";
import { BlockSelectionToolbar } from "./BlockSelectionToolbar";
import {
  PageTitleEditor,
  type PageTitleEditorHandle
} from "./PageTitleEditor";
import { useBlockDragState } from "../hooks/useBlockDragState";
import { useInputMode } from "../hooks/useInputMode";
import { useLastBlockFocus } from "../hooks/useLastBlockFocus";
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

type PageEditorProps = {
  document: PageDocument;
  onCreateBlockAfter: (block: Block, draft?: CreateBlockDraft) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => Promise<void> | void;
  onFocusNextBlock: (block: Block) => void;
  onFocusFirstBlock: () => void;
  onFocusPreviousBlock: (block: Block) => void;
  onMoveBlock: (block: Block, afterBlockId: string | null) => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onTextDraftChange: (block: Block, text: string) => void;
  onTextDraftFlush: (block: Block, text: string) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<string | null>;
  onTextUndo: (block: Block) => Promise<string | null>;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
  onUpdatePageTitle: (page: Page, title: string) => void;
};

export function PageEditor({
  document,
  onCreateBlockAfter,
  onDeleteBlock,
  onDeleteBlocks,
  onDuplicateBlocks,
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onMoveBlock,
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

  const focusLastBlock = useLastBlockFocus({
    document,
    onCreateBlockAfter
  });
  const numberedListMarkers = getNumberedListMarkers(document.blocks);
  const {
    clearDragState,
    clearBlockSelection,
    draggedBlockId,
    dropBlock,
    dropTarget,
    selectBlock,
    selectedBlockIds,
    setDropPlacement,
    startDrag
  } = useBlockDragState({
    blocks: document.blocks,
    onMoveBlock
  });

  function focusTitle() {
    titleRef.current?.focus();
  }

  const selectedBlocks = document.blocks.filter((block) =>
    selectedBlockIds.includes(block.id)
  );

  function handleTextDraftChange(block: Block, text: string) {
    onTextDraftChange(block, text);
  }

  function handleHistoryTextApply(block: Block, text: string) {
    onTextHistoryApply(block, text);
  }

  return (
    <>
      <PageTitleEditor
        onFocusFirstBlock={onFocusFirstBlock}
        onUpdatePageTitle={onUpdatePageTitle}
        page={document.page}
        ref={titleRef}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div
          className="grid min-h-full gap-0.5 pb-20 pl-10"
          onMouseDown={focusLastBlock}
          role="presentation"
        >
          <BlockSelectionToolbar
            count={selectedBlocks.length}
            onClear={clearBlockSelection}
            onDelete={() => {
              onDeleteBlocks(selectedBlocks);
              clearBlockSelection();
            }}
            onDuplicate={() => {
              void onDuplicateBlocks(selectedBlocks);
              clearBlockSelection();
            }}
          />
          {document.blocks.map((block, blockIndex) => (
            <BlockEditor
              block={block}
              blockIndex={blockIndex}
              blocksCount={document.blocks.length}
              isDragging={draggedBlockId === block.id}
              isDropAfter={
                dropTarget?.blockId === block.id && dropTarget.placement === "after"
              }
              isDropBefore={
                dropTarget?.blockId === block.id && dropTarget.placement === "before"
              }
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
              onDragEnd={clearDragState}
              onDragOver={setDropPlacement}
              onDragStart={startDrag}
              onDrop={dropBlock}
              onFocusNext={onFocusNextBlock}
              onFocusPrevious={(target) =>
                blockIndex === 0 ? focusTitle() : onFocusPreviousBlock(target)
              }
              onPasteMarkdown={onPasteMarkdown}
              onSelect={selectBlock}
              onTextDraftChange={handleTextDraftChange}
              onTextDraftFlush={onTextDraftFlush}
              onTextHistoryApply={handleHistoryTextApply}
              onTextRedo={onTextRedo}
              onTextUndo={onTextUndo}
              onUpdate={onUpdateBlock}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  );
}
