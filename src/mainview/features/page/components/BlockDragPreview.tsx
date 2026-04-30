import type { Block } from "../../../../shared/contracts";
import { cn } from "@/mainview/lib/utils";

type BlockDragPreviewState = {
  selectedBlockIds: string[];
  x: number;
  y: number;
};

type BlockDragPreviewProps = {
  blocks: Block[];
  preview: BlockDragPreviewState | null;
};

export function BlockDragPreview({ blocks, preview }: BlockDragPreviewProps) {
  if (!preview) {
    return null;
  }

  const previewBlocks = blocks
    .filter((block) => preview.selectedBlockIds.includes(block.id))
    .slice(0, 3);

  return (
    <div
      className="pointer-events-none fixed z-50 w-80 rounded-md border border-border bg-background/95 p-2 text-sm text-foreground opacity-95"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${preview.x}px, ${preview.y}px, 0)`
      }}
    >
      <div className="grid gap-1">
        {previewBlocks.map((block) => (
          <PreviewBlock block={block} key={block.id} />
        ))}
      </div>
      {preview.selectedBlockIds.length > previewBlocks.length ? (
        <div className="mt-1 border-t border-border pt-1 text-xs text-muted-foreground">
          +{preview.selectedBlockIds.length - previewBlocks.length} blocks
        </div>
      ) : null}
    </div>
  );
}

function PreviewBlock({ block }: { block: Block }) {
  if (block.type === "divider") {
    return (
      <div className="flex h-7 items-center rounded bg-muted/40 px-2">
        <span className="h-px w-full bg-border" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded bg-muted/50 px-2 py-1">
      <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
        {getBlockMarker(block)}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          block.type === "heading_1" && "font-semibold",
          block.type === "heading_2" && "font-medium",
          block.type === "todo" && Boolean(block.props.checked) && "line-through"
        )}
      >
        {block.text}
      </span>
    </div>
  );
}

function getBlockMarker(block: Block) {
  switch (block.type) {
    case "bulleted_list":
      return "-";
    case "numbered_list":
      return "1.";
    case "todo":
      return block.props.checked ? "[x]" : "[ ]";
    case "quote":
      return ">";
    case "heading_1":
      return "H1";
    case "heading_2":
      return "H2";
    default:
      return "";
  }
}
