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

export type PageEditorBlockActions = {
  createAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  createPageLink: (block: Block) => Promise<void> | void;
  deleteOne: (block: Block) => void;
  focusNext: (block: Block) => boolean;
  focusPrevious: (block: Block) => boolean;
  mergeWithPrevious: (
    previousBlock: Block,
    block: Block,
    text: string,
    props: Block["props"]
  ) => Promise<void> | void;
  moveOutOfParent: (block: Block) => Promise<void> | void;
  openPageLink: (pageId: string, options?: OpenPageLinkOptions) => void;
  restorePageLink: (pageId: string) => void;
  update: (block: Block, changes: BlockEditorUpdate) => Promise<void> | void;
};

export type PageEditorBlockCollectionActions = {
  deleteMany: (blocks: Block[]) => void;
  duplicateMany: (blocks: Block[]) => void;
  indentMany: (blocks: Array<{ block: Block; props: Block["props"] }>) => void;
  moveMany: (
    blocks: Block[],
    afterBlockId: string | null,
    parentBlockId?: string | null
  ) => Promise<void> | void;
  pasteAfter: (afterBlock: Block) => Promise<Block[]> | Block[];
};

export type PageEditorTextActions = {
  changeDraft: TextDraftChangeHandler;
  flushDraft: TextDraftFlushHandler;
  pasteMarkdown: PasteMarkdownHandler;
  applyHistory: (block: Block, text: string) => void;
  redo: (block: Block) => Promise<Block | null>;
  undo: (block: Block) => Promise<Block | null>;
};

export type PageEditorTitleActions = {
  focusFirstBlock: () => void;
  updateTitle: (page: Page, title: string) => void;
};

export type PageEditorProps = {
  blockActions: PageEditorBlockActions;
  blockCollectionActions: PageEditorBlockCollectionActions;
  document: PageDocument;
  pages: Page[];
  textActions: PageEditorTextActions;
  titleActions: PageEditorTitleActions;
};

export type PageEditorControllerOptions = Pick<
  PageEditorProps,
  "blockActions" | "blockCollectionActions" | "document" | "textActions"
> & {
  openSearch: () => void;
};
