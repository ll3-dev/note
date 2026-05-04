import { useEffect } from "react";
import type { Block, PageDocument } from "@/shared/contracts";
import {
  handleSelectedBlockShortcut,
  type KeyboardBlockSelectionResult
} from "@/mainview/features/page/lib/selectedBlockShortcuts";

export {
  getBlockSelectAllShortcutIds,
  getSelectedBlockEditTargetId,
  getSelectedBlockShortcutScopeIds,
  shouldIgnoreSelectedBlockShortcutTarget
} from "@/mainview/features/page/lib/selectedBlockShortcuts";

type UseSelectedBlockShortcutsOptions = {
  clearSelection: () => void;
  document: PageDocument;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onFocusBlock: (blockId: string) => void;
  onFocusTitle: () => void;
  onIndentBlocks: (blocks: Array<{ block: Block; props: Block["props"] }>) => void;
  onKeyboardSelection: (selection: KeyboardBlockSelectionResult) => void;
  onMoveBlocks: (
    blocks: Block[],
    afterBlockId: string | null,
    parentBlockId?: string | null
  ) => Promise<void> | void;
  onPasteBlocks: (afterBlock: Block) => Promise<Block[]> | Block[];
  selectionAnchorBlockId: string | null;
  selectionFocusBlockId: string | null;
  selectedBlocks: Block[];
  setSelection: (blockIds: string[]) => void;
};

export function useSelectedBlockShortcuts({
  clearSelection,
  document,
  onDeleteBlocks,
  onDuplicateBlocks,
  onFocusBlock,
  onFocusTitle,
  onIndentBlocks,
  onKeyboardSelection,
  onMoveBlocks,
  onPasteBlocks,
  selectionAnchorBlockId,
  selectionFocusBlockId,
  selectedBlocks,
  setSelection
}: UseSelectedBlockShortcutsOptions) {
  useEffect(() => {
    const selectedBlockIds = selectedBlocks.map((block) => block.id);

    function handleKeyDown(event: KeyboardEvent) {
      handleSelectedBlockShortcut(event, {
        clearSelection,
        document,
        onDeleteBlocks,
        onDuplicateBlocks,
        onFocusBlock,
        onFocusTitle,
        onIndentBlocks,
        onKeyboardSelection,
        onMoveBlocks,
        onPasteBlocks,
        selectionAnchorBlockId,
        selectionFocusBlockId,
        selectedBlockIds,
        selectedBlocks,
        setSelection
      });
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [
    clearSelection,
    document,
    onDeleteBlocks,
    onDuplicateBlocks,
    onFocusBlock,
    onFocusTitle,
    onIndentBlocks,
    onKeyboardSelection,
    onMoveBlocks,
    onPasteBlocks,
    selectionAnchorBlockId,
    selectionFocusBlockId,
    selectedBlocks,
    setSelection
  ]);
}
