import type { ComponentProps } from "react";
import type { Block, PageDocument } from "../../../../shared/contracts";
import { PageEditor } from "../../page/components/PageEditor";
import type { CreateBlockDraft } from "../../page/lib/blockEditingBehavior";
import type {
  BlockEditorUpdate,
  TextSelectionOffsets
} from "../../page/types/blockEditorTypes";
import { EmptyEditorState } from "./EmptyEditorState";

type WorkspaceEditorPaneProps = {
  document: PageDocument | null;
  isLoading: boolean;
  onCreateBlockAfter: (block: Block, draft?: CreateBlockDraft) => Promise<void>;
  onDeleteBlock: (block: Block) => void;
  onDeleteBlocks: (blocks: Block[]) => void;
  onFocusFirstBlock: () => void;
  onFocusNextBlock: (block: Block) => void;
  onFocusPreviousBlock: (block: Block) => void;
  onMoveBlock: (block: Block, afterBlockId: string | null) => Promise<void> | void;
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
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onMoveBlock,
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
          onFocusFirstBlock={onFocusFirstBlock}
          onFocusNextBlock={onFocusNextBlock}
          onFocusPreviousBlock={onFocusPreviousBlock}
          onMoveBlock={onMoveBlock}
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
