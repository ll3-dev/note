import type { Block, Page, PageDocument } from "@/shared/contracts";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";
import type {
  BlockEditorUpdate,
  CreateBlockOptions,
  OpenPageLinkOptions,
  TextSelectionOffsets
} from "./blockEditorTypes";

export type PasteMarkdownHandler = (
  block: Block,
  markdown: string,
  editableElement: HTMLElement,
  selection: TextSelectionOffsets
) => Promise<void> | void;

export type TextDraftChangeHandler = (
  block: Block,
  text: string,
  props?: Block["props"]
) => void;

export type TextDraftFlushHandler = (
  block: Block,
  text: string,
  props?: Block["props"]
) => Promise<void>;

export type PageEditorProps = {
  document: PageDocument;
  onCreateBlockAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onCreatePageLink: (block: Block) => Promise<void> | void;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onPasteBlocks: (afterBlock: Block) => Promise<Block[]> | Block[];
  onFocusNextBlock: (block: Block) => boolean;
  onFocusFirstBlock: () => void;
  onFocusPreviousBlock: (block: Block) => boolean;
  onIndentBlocks: (blocks: Array<{ block: Block; props: Block["props"] }>) => void;
  onMergeBlockWithPrevious: (
    previousBlock: Block,
    block: Block,
    text: string,
    props: Block["props"]
  ) => Promise<void> | void;
  onMoveBlocks: (
    blocks: Block[],
    afterBlockId: string | null
  ) => Promise<void> | void;
  onPasteMarkdown: PasteMarkdownHandler;
  onOpenPageLink: (pageId: string, options?: OpenPageLinkOptions) => void;
  onRestorePageLink: (pageId: string) => void;
  onTextDraftChange: TextDraftChangeHandler;
  onTextDraftFlush: TextDraftFlushHandler;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<Block | null>;
  onTextUndo: (block: Block) => Promise<Block | null>;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
  onUpdatePageTitle: (page: Page, title: string) => void;
  pages: Page[];
};

export type PageEditorControllerOptions = Pick<
  PageEditorProps,
  | "document"
  | "onCreateBlockAfter"
  | "onCreatePageLink"
  | "onDeleteBlock"
  | "onDeleteBlocks"
  | "onDuplicateBlocks"
  | "onFocusNextBlock"
  | "onFocusPreviousBlock"
  | "onIndentBlocks"
  | "onMergeBlockWithPrevious"
  | "onMoveBlocks"
  | "onOpenPageLink"
  | "onPasteBlocks"
  | "onPasteMarkdown"
  | "onRestorePageLink"
  | "onTextDraftChange"
  | "onTextDraftFlush"
  | "onTextHistoryApply"
  | "onTextRedo"
  | "onTextUndo"
  | "onUpdateBlock"
>;
