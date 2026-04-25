import { Plus } from "lucide-react";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import type { Block, PageDocument } from "../../../../shared/contracts";
import { BlockEditor } from "./BlockEditor";
import { useBlockDragState } from "../hooks/useBlockDragState";
import { useInputMode } from "../hooks/useInputMode";
import { useLastBlockFocus } from "../hooks/useLastBlockFocus";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

type PageEditorProps = {
  document: PageDocument;
  isCreatingBlock: boolean;
  isDeletingBlock: boolean;
  onCreateBlock: () => void;
  onCreateBlockAfter: (block: Block) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onFocusPreviousBlock: (block: Block) => void;
  onMoveBlock: (block: Block, afterBlockId: string | null) => void;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
};

export function PageEditor({
  document,
  isCreatingBlock,
  isDeletingBlock,
  onCreateBlock,
  onCreateBlockAfter,
  onDeleteBlock,
  onFocusPreviousBlock,
  onMoveBlock,
  onUpdateBlock
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

  return (
    <>
      <header className="mb-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Badge variant="outline">{document.blocks.length} blocks</Badge>
          <Button
            disabled={isCreatingBlock}
            onClick={onCreateBlock}
            size="sm"
            variant="ghost"
          >
            <Plus className="size-4" />
            Block
          </Button>
        </div>
        <h1 className="text-[40px] font-bold leading-tight tracking-normal">
          {document.page.title}
        </h1>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid min-h-full gap-1 pb-20" onMouseDown={focusLastBlock}>
          {document.blocks.map((block, blockIndex) => (
            <BlockEditor
              block={block}
              blockIndex={blockIndex}
              blocksCount={document.blocks.length}
              isDragging={draggedBlockId === block.id}
              isDeleting={isDeletingBlock}
              isDropAfter={
                dropTarget?.blockId === block.id && dropTarget.placement === "after"
              }
              isDropBefore={
                dropTarget?.blockId === block.id && dropTarget.placement === "before"
              }
              isSelected={selectedBlockId === block.id}
              key={block.id}
              onCreateAfter={onCreateBlockAfter}
              onDelete={onDeleteBlock}
              onDragEnd={clearDragState}
              onDragOver={setDropPlacement}
              onDragStart={startDrag}
              onDrop={dropBlock}
              onFocusPrevious={onFocusPreviousBlock}
              onSelect={selectBlock}
              onUpdate={onUpdateBlock}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  );
}
