import type { PointerEvent } from "react";
import type {
  Block,
  BlockProps,
  BlockType,
  Page
} from "@/shared/contracts";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";

export type BlockEditorUpdate = {
  props?: BlockProps;
  text?: string;
  type?: BlockType;
};

export type CreateBlockOptions = {
  focusPlacement?: "end" | "start";
};

export type OpenPageLinkOptions = {
  newTab?: boolean;
};

export type TextSelectionOffsets = {
  end: number;
  start: number;
};

export type SearchHighlight = {
  length: number;
  offset: number;
};

export type BlockEditorProps = {
  block: Block;
  blockIndex: number;
  blocksCount: number;
  isDragging: boolean;
  isBlockRangeSelecting: boolean;
  isSelected: boolean;
  maxIndentDepth: number;
  numberedListMarker: number | null;
  numberedListStartAfterIndent: number | null;
  numberedListStartAfterOutdent: number | null;
  linkedPage: Page | null;
  previousBlock: Block | null;
  onCreateAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onCreatePageLink: (block: Block) => Promise<void> | void;
  onMergeWithPrevious: (
    previousBlock: Block,
    block: Block,
    text: string,
    props: BlockProps
  ) => Promise<void> | void;
  onDelete: (block: Block) => void;
  onDragEnd: () => void;
  onDragOver: (block: Block, placement: "before" | "after") => void;
  onDragPointerDown: (block: Block, event: PointerEvent<HTMLElement>) => void;
  onDragStart: (block: Block, event?: React.DragEvent<HTMLElement>) => void;
  onDrop: (block: Block, placement: "before" | "after") => void;
  onFocusNext: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onOpenPageLink: (pageId: string, options?: OpenPageLinkOptions) => void;
  onRestorePageLink: (pageId: string) => void;
  onSelectionChange?: () => void;
  onTextDraftChange: (block: Block, text: string, props?: BlockProps) => void;
  onTextDraftFlush: (
    block: Block,
    text: string,
    props?: BlockProps
  ) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<Block | null>;
  onTextUndo: (block: Block) => Promise<Block | null>;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  openSearch: () => void;
  searchHighlights?: SearchHighlight[];
  searchActiveHighlight?: SearchHighlight;
};

export type BlockEditorActions = Pick<
  BlockEditorProps,
  | "onCreateAfter"
  | "onCreatePageLink"
  | "onDelete"
  | "onFocusNext"
  | "onFocusPrevious"
  | "onMergeWithPrevious"
  | "onOpenPageLink"
  | "onPasteMarkdown"
  | "onRestorePageLink"
  | "onTextDraftChange"
  | "onTextDraftFlush"
  | "onTextHistoryApply"
  | "onTextRedo"
  | "onTextUndo"
  | "onUpdate"
  | "openSearch"
>;

export type BlockEditorDragActions = Pick<
  BlockEditorProps,
  "onDragEnd" | "onDragOver" | "onDragPointerDown" | "onDragStart" | "onDrop"
>;
