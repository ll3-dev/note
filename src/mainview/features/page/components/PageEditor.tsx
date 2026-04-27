import type { KeyboardEvent } from "react";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import type { Block, Page, PageDocument } from "../../../../shared/contracts";
import { BlockEditor } from "./BlockEditor";
import { useBlockDragState } from "../hooks/useBlockDragState";
import { useInputMode } from "../hooks/useInputMode";
import { useLastBlockFocus } from "../hooks/useLastBlockFocus";
import {
  getBlockDepth,
  type CreateBlockDraft
} from "../lib/blockEditingBehavior";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

type PageEditorProps = {
  document: PageDocument;
  onCreateBlockAfter: (block: Block, draft?: CreateBlockDraft) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onFocusNextBlock: (block: Block) => void;
  onFocusPreviousBlock: (block: Block) => void;
  onMoveBlock: (block: Block, afterBlockId: string | null) => void;
  onTextDraftChange: (block: Block, text: string) => void;
  onTextDraftFlush: (block: Block, text: string) => Promise<void>;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
  onUpdatePageTitle: (page: Page, title: string) => void;
};

export function PageEditor({
  document,
  onCreateBlockAfter,
  onDeleteBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onMoveBlock,
  onTextDraftChange,
  onTextDraftFlush,
  onUpdateBlock,
  onUpdatePageTitle
}: PageEditorProps) {
  useInputMode();

  const focusLastBlock = useLastBlockFocus(document);
  const {
    clearDragState,
    draggedBlockId,
    dropBlock,
    dropTarget,
    selectBlock,
    selectedBlockId,
    setDropPlacement,
    startDrag
  } = useBlockDragState({
    blocks: document.blocks,
    onMoveBlock
  });

  function saveTitle(target: HTMLElement) {
    const title = (target.textContent ?? "").trim();

    if (title && title !== document.page.title) {
      onUpdatePageTitle(document.page, title);
    } else {
      target.textContent = document.page.title;
    }
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLHeadingElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveTitle(event.currentTarget);
      event.currentTarget.blur();
    }
  }

  return (
    <>
      <header className="mb-7 pl-10">
        <h1
          className="rounded-sm text-[40px] font-bold leading-tight tracking-normal outline-none"
          contentEditable="plaintext-only"
          onBlur={(event) => saveTitle(event.currentTarget)}
          onKeyDown={handleTitleKeyDown}
          suppressContentEditableWarning
        >
          {document.page.title}
        </h1>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div
          className="grid min-h-full gap-0.5 pb-20 pl-10"
          onMouseDown={focusLastBlock}
          role="presentation"
        >
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
              isSelected={selectedBlockId === block.id}
              key={block.id}
              maxIndentDepth={getMaxIndentDepth(document.blocks, blockIndex)}
              onCreateAfter={onCreateBlockAfter}
              onDelete={onDeleteBlock}
              onDragEnd={clearDragState}
              onDragOver={setDropPlacement}
              onDragStart={startDrag}
              onDrop={dropBlock}
              onFocusNext={onFocusNextBlock}
              onFocusPrevious={onFocusPreviousBlock}
              onSelect={selectBlock}
              onTextDraftChange={onTextDraftChange}
              onTextDraftFlush={onTextDraftFlush}
              onUpdate={onUpdateBlock}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  );
}

function getMaxIndentDepth(blocks: Block[], index: number) {
  if (index === 0) {
    return 0;
  }

  return getBlockDepth(blocks[index - 1]) + 1;
}
