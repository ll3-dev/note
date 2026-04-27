import { GripVertical } from "lucide-react";
import type { DragEvent, MouseEvent } from "react";
import type { Block } from "../../../../shared/contracts";

type BlockDragHandleProps = {
  block: Block;
  onDragEnd: () => void;
  onDragStart: (block: Block) => void;
  onSelect: (block: Block) => void;
};

export function BlockDragHandle({
  block,
  onDragEnd,
  onDragStart,
  onSelect
}: BlockDragHandleProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", block.id);
    onDragStart(block);
  }

  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    onSelect(block);
  }

  return (
    <div
      aria-label="block 선택 및 이동"
      className="block-hover-action flex h-9 w-10 cursor-grab items-center justify-center self-center text-muted-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
      draggable
      onClick={() => onSelect(block)}
      onDragEnd={onDragEnd}
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={-1}
    >
      <GripVertical className="size-4" />
    </div>
  );
}
