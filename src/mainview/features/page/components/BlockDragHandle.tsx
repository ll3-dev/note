import { GripVertical } from "lucide-react";
import type { DragEvent, MouseEvent } from "react";
import type { Block } from "../../../../shared/contracts";

type BlockDragHandleProps = {
  block: Block;
  onDragEnd: () => void;
  onDragStart: (block: Block) => void;
  onSelect: (block: Block, event?: MouseEvent) => void;
};

export function BlockDragHandle({
  block,
  onDragEnd,
  onDragStart,
  onSelect
}: BlockDragHandleProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", block.id);
    onDragStart(block);
  }

  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onSelect(block, event);
  }

  return (
    <button
      aria-label="block 선택 및 이동"
      className="block-hover-action absolute -left-7 top-px flex h-7 w-6 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
      draggable
      onClick={(event) => onSelect(block, event)}
      onDragEnd={onDragEnd}
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
      tabIndex={-1}
      type="button"
    >
      <GripVertical className="size-4" />
    </button>
  );
}
