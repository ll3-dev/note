import type { ComponentProps } from "react";
import type { Backlink, Block, PageDocument } from "@/shared/contracts";
import { PageEditor } from "@/mainview/features/page/components/PageEditor";
import type { CreateBlockDraft } from "@/mainview/features/page/lib/blockEditingBehavior";
import type {
  BlockEditorUpdate,
  CreateBlockOptions,
  TextSelectionOffsets
} from "@/mainview/features/page/types/blockEditorTypes";
import { EmptyEditorState } from "./EmptyEditorState";

type WorkspaceEditorPaneProps = {
  document: PageDocument | null;
  isLoading: boolean;
  backlinks: Backlink[];
  onCreateBlockAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onCreatePageLink: (block: Block, query: string) => Promise<void> | void;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onPasteBlocks: (afterBlock: Block) => Promise<Block[]> | Block[];
  onFocusFirstBlock: () => void;
  onFocusNextBlock: (block: Block) => boolean;
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
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onOpenPageLink: (pageId: string) => void;
  onTextDraftChange: (
    block: Block,
    text: string,
    props?: Block["props"]
  ) => void;
  onTextDraftFlush: (
    block: Block,
    text: string,
    props?: Block["props"]
  ) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
  onTextRedo: (block: Block) => Promise<Block | null>;
  onTextUndo: (block: Block) => Promise<Block | null>;
  onUpdateBlock: (block: Block, changes: BlockEditorUpdate) => void;
  onUpdatePageTitle: PageEditorTitleHandler;
};

type PageEditorTitleHandler = ComponentProps<typeof PageEditor>["onUpdatePageTitle"];

export function WorkspaceEditorPane({
  document,
  isLoading,
  backlinks,
  onCreateBlockAfter,
  onCreatePageLink,
  onDeleteBlock,
  onDeleteBlocks,
  onDuplicateBlocks,
  onPasteBlocks,
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onIndentBlocks,
  onMergeBlockWithPrevious,
  onMoveBlocks,
  onPasteMarkdown,
  onOpenPageLink,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onTextRedo,
  onTextUndo,
  onUpdateBlock,
  onUpdatePageTitle
}: WorkspaceEditorPaneProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {document ? (
        <PageEditor
          document={document}
          onCreateBlockAfter={onCreateBlockAfter}
          onCreatePageLink={onCreatePageLink}
          onDeleteBlock={onDeleteBlock}
          onDeleteBlocks={onDeleteBlocks}
          onDuplicateBlocks={onDuplicateBlocks}
          onPasteBlocks={onPasteBlocks}
          onFocusFirstBlock={onFocusFirstBlock}
          onFocusNextBlock={onFocusNextBlock}
          onFocusPreviousBlock={onFocusPreviousBlock}
          onIndentBlocks={onIndentBlocks}
          onMergeBlockWithPrevious={onMergeBlockWithPrevious}
          onMoveBlocks={onMoveBlocks}
          onPasteMarkdown={onPasteMarkdown}
          onOpenPageLink={onOpenPageLink}
          onTextDraftChange={onTextDraftChange}
          onTextDraftFlush={onTextDraftFlush}
          onTextHistoryApply={onTextHistoryApply}
          onTextRedo={onTextRedo}
          onTextUndo={onTextUndo}
          onUpdateBlock={onUpdateBlock}
          onUpdatePageTitle={onUpdatePageTitle}
        />
      ) : (
        <EmptyEditorState isLoading={isLoading} />
      )}
      {document && backlinks.length > 0 ? (
        <div className="border-t border-border/70 px-12 py-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Backlinks</div>
          <div className="flex flex-wrap gap-2">
            {backlinks.map((backlink) => (
              <button
                className="rounded-sm border border-border/80 px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                key={backlink.blockId}
                onClick={() => onOpenPageLink(backlink.pageId)}
                type="button"
              >
                {backlink.pageTitle}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
