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
  onDuplicateBlocks: (blocks: Block[]) => Promise<void> | void;
  onFocusFirstBlock: () => void;
  onFocusNextBlock: (block: Block) => void;
  onFocusPreviousBlock: (block: Block) => void;
  onMoveBlock: (block: Block, afterBlockId: string | null) => void;
  onPasteMarkdown: (
    block: Block,
    markdown: string,
    editableElement: HTMLElement,
    selection: TextSelectionOffsets
  ) => Promise<void> | void;
  onTextDraftChange: (block: Block, text: string) => void;
  onTextDraftFlush: (block: Block, text: string) => Promise<void>;
  onTextHistoryApply: (block: Block, text: string) => void;
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
  onFocusFirstBlock,
  onFocusNextBlock,
  onFocusPreviousBlock,
  onMoveBlock,
  onPasteMarkdown,
  onTextDraftChange,
  onTextDraftFlush,
  onTextHistoryApply,
  onUpdateBlock,
  onUpdatePageTitle
}: WorkspaceEditorPaneProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-230 flex-col px-10 py-8">
      {document ? (
        <PageEditor
          document={document}
          onCreateBlockAfter={onCreateBlockAfter}
          onDeleteBlock={onDeleteBlock}
          onDeleteBlocks={onDeleteBlocks}
          onDuplicateBlocks={onDuplicateBlocks}
          onFocusFirstBlock={onFocusFirstBlock}
          onFocusNextBlock={onFocusNextBlock}
          onFocusPreviousBlock={onFocusPreviousBlock}
          onMoveBlock={onMoveBlock}
          onPasteMarkdown={onPasteMarkdown}
          onTextDraftChange={onTextDraftChange}
          onTextDraftFlush={onTextDraftFlush}
          onTextHistoryApply={onTextHistoryApply}
          onUpdateBlock={onUpdateBlock}
          onUpdatePageTitle={onUpdatePageTitle}
        />
      ) : (
        <EmptyEditorState isLoading={isLoading} />
      )}
    </div>
  );
}
