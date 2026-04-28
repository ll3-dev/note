import type { MouseEvent } from "react";
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

export type TextSelectionOffsets = {
  end: number;
  start: number;
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
  numberedListMarker: number | null;
  numberedListStartAfterIndent: number | null;
  numberedListStartAfterOutdent: number | null;
  onCreateAfter: (block: Block, draft?: CreateBlockDraft) => Promise<void>;
  onDelete: (block: Block) => void;
  onDragEnd: () => void;
  onDragOver: (block: Block, placement: "before" | "after") => void;
  onDragStart: (block: Block) => void;
  onDrop: (block: Block, placement: "before" | "after") => void;
  onFocusNext: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onSelect: (block: Block, event?: MouseEvent) => void;
  onSelectionChange?: () => void;
  onTextDraftChange: (block: Block, text: string) => void;
  onTextDraftFlush: (block: Block, text: string) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => string | null;
  onTextUndo: (block: Block) => string | null;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
};
