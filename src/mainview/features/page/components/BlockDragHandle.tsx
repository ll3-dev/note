import { GripVertical } from "lucide-react";
import type { DragEvent, PointerEvent } from "react";
import type { Block } from "@/shared/contracts";
import { cn } from "@/mainview/lib/utils";

type BlockDragHandleProps = {
  block: Block;
  canDrag?: boolean;
  onDragEnd: () => void;
  onDragPointerDown: (block: Block, event: PointerEvent<HTMLButtonElement>) => void;
  onSelectBlock: (block: Block) => void;
  onDragStart: (block: Block, event?: DragEvent<HTMLButtonElement>) => void;
  variant?: "callout" | "nested" | "root";
};

export function BlockDragHandle({
  block,
  canDrag = true,
  onDragEnd,
  onDragPointerDown,
  onSelectBlock,
  onDragStart,
  variant = "root"
}: BlockDragHandleProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>) {
    if (!canDrag) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onDragStart(block, event);
  }

  return (
    <button
      aria-label={
        variant === "callout" ? "callout 전체 선택 및 이동" : "block 선택 및 이동"
      }
      className={cn(
        "block-hover-action absolute top-px flex cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 active:cursor-grabbing",
        variant === "callout" &&
          "-left-9 h-[calc(100%-2px)] min-h-7 w-8 rounded-sm border border-transparent hover:border-border hover:bg-accent",
        variant === "nested" && "-left-5 h-7 w-5",
        variant === "root" && "-left-7 h-7 w-6"
      )}
      data-block-drag-handle
      draggable={canDrag}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectBlock(block);
      }}
      onDragEnd={onDragEnd}
      onDragStart={handleDragStart}
      onPointerDown={(event) => {
        if (!canDrag) {
          event.preventDefault();
          event.stopPropagation();
          onSelectBlock(block);
          return;
        }

        onDragPointerDown(block, event);
      }}
      tabIndex={-1}
      type="button"
    >
      <GripVertical className="size-4" />
    </button>
  );
}
