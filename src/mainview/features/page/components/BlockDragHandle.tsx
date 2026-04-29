import { GripVertical } from "lucide-react";
import type { DragEvent, MouseEvent, PointerEvent } from "react";
import type { Block } from "../../../../shared/contracts";

type BlockDragHandleProps = {
  block: Block;
  onDragEnd: () => void;
  onDragPointerDown: (block: Block, event: PointerEvent<HTMLButtonElement>) => void;
  onDragStart: (block: Block, event?: DragEvent<HTMLButtonElement>) => void;
  onSelect: (block: Block, event?: MouseEvent) => void;
};

export function BlockDragHandle({
  block,
  onDragEnd,
  onDragPointerDown,
  onDragStart,
  onSelect
}: BlockDragHandleProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    onDragStart(block, event);
  }

  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onSelect(block, event);
  }

  return (
    <button
      aria-label="block 선택 및 이동"
      className="block-hover-action absolute -left-7 top-px flex h-7 w-6 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
      data-block-drag-handle
      draggable
      onClick={(event) => onSelect(block, event)}
      onDragEnd={onDragEnd}
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
      onPointerDown={(event) => onDragPointerDown(block, event)}
      tabIndex={-1}
      type="button"
    >
      <GripVertical className="size-4" />
    </button>
  );
}
