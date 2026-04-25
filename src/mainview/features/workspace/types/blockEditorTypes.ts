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
  isDeleting: boolean;
  onCreateAfter: (block: Block) => Promise<void>;
  onDelete: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};
