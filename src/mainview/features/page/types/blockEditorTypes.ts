import type {
  Block,
  BlockProps,
  BlockType
} from "../../../../shared/contracts";
import type { CreateBlockDraft } from "../lib/blockEditingBehavior";

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
  maxIndentDepth: number;
  onCreateAfter: (block: Block, draft?: CreateBlockDraft) => Promise<void>;
  onDelete: (block: Block) => void;
  onDragEnd: () => void;
  onDragOver: (block: Block, placement: "before" | "after") => void;
  onDragStart: (block: Block) => void;
  onDrop: (block: Block, placement: "before" | "after") => void;
  onFocusNext: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
  onSelect: (block: Block) => void;
  onTextDraftChange: (block: Block, text: string) => void;
  onTextDraftFlush: (block: Block, text: string) => Promise<void>;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};
