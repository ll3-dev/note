import type { ComponentProps } from "react";
import type { Block, PageDocument } from "@/shared/contracts";
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
  onCreateBlockAfter: (
    block: Block,
    draft?: CreateBlockDraft,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onPasteBlocks: (afterBlock: Block) => Promise<Block[]> | Block[];
  onFocusFirstBlock: () => void;
  onFocusNextBlock: (block: Block) => void;
  onFocusPreviousBlock: (block: Block) => void;
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
  onCreateBlockAfter,
  onDeleteBlock,
  onDeleteBlocks,
  onDuplicateBlocks,
  onPasteBlocks,
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onMergeBlockWithPrevious,
  onMoveBlocks,
  onPasteMarkdown,
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
          onDeleteBlock={onDeleteBlock}
          onDeleteBlocks={onDeleteBlocks}
          onDuplicateBlocks={onDuplicateBlocks}
          onPasteBlocks={onPasteBlocks}
          onFocusFirstBlock={onFocusFirstBlock}
          onFocusNextBlock={onFocusNextBlock}
          onFocusPreviousBlock={onFocusPreviousBlock}
          onMergeBlockWithPrevious={onMergeBlockWithPrevious}
          onMoveBlocks={onMoveBlocks}
          onPasteMarkdown={onPasteMarkdown}
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
    </div>
  );
}
