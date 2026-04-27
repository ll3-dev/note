import type {
  Block,
  BlockProps,
  BlockType
} from "../../../../shared/contracts";

export type BlockEditorUpdate = {
  props?: BlockProps;
  text?: string;
  type?: BlockType;
};

export type BlockEditorProps = {
  block: Block;
  blockIndex: number;
  blocksCount: number;
  isDragging: boolean;
  isDropAfter: boolean;
  isDropBefore: boolean;
  isSelected: boolean;
  onCreateAfter: (block: Block) => Promise<void>;
  onDelete: (block: Block) => void;
  onDragEnd: () => void;
  onDragOver: (block: Block, placement: "before" | "after") => void;
  onDragStart: (block: Block) => void;
  onDrop: (block: Block, placement: "before" | "after") => void;
  onFocusNext: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
  onSelect: (block: Block) => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};
