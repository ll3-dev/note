import type { Block } from "@/shared/contracts";

export type BlockDragPreviewState = {
  selectedBlockIds: string[];
  x: number;
  y: number;
};

export function getBlockDragPreviewBlocks(
  blocks: Block[],
  preview: BlockDragPreviewState
) {
  return blocks
    .filter((block) => preview.selectedBlockIds.includes(block.id))
    .slice(0, 3);
}

export function getBlockDragPreviewMarker(block: Block) {
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
