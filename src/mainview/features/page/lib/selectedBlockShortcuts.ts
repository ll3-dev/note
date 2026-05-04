import type { Block, PageDocument } from "@/shared/contracts";
import { copyBlocksToClipboard } from "@/mainview/features/page/lib/blockClipboard";
import { getAfterBlockIdForKeyboardBlockMove } from "@/mainview/features/page/lib/blockDrag";
import {
  getBlocksWithDescendants,
  getIndentedSubtreeBlockUpdates,
  getSubtreeSafeAfterBlockId
} from "@/mainview/features/page/lib/blockTree";
import {
  getKeyboardBlockSelection,
  type KeyboardBlockSelectionResult
} from "@/mainview/features/page/lib/blockSelection";
import {
  getBlockSelectAllShortcutIds,
  getSelectedBlockEditTargetId,
  getTargetBlockId,
  shouldIgnoreEditableEscapeTarget,
  shouldIgnoreSelectedBlockShortcutTarget
} from "@/mainview/features/page/lib/selectedBlockShortcutTargets";

export type { KeyboardBlockSelectionResult };
export {
  getBlockSelectAllShortcutIds,
  getSelectedBlockEditTargetId,
  shouldIgnoreSelectedBlockShortcutTarget
};

type SelectedBlockShortcutContext = {
  clearSelection: () => void;
  document: PageDocument;
  onDeleteBlocks: (blocks: Block[]) => void;
  onDuplicateBlocks: (blocks: Block[]) => void;
  onFocusBlock: (blockId: string) => void;
  onFocusTitle: () => void;
  onIndentBlocks: (blocks: Array<{ block: Block; props: Block["props"] }>) => void;
  onKeyboardSelection: (selection: KeyboardBlockSelectionResult) => void;
  onMoveBlocks: (blocks: Block[], afterBlockId: string | null) => Promise<void> | void;
  onPasteBlocks: (afterBlock: Block) => Promise<Block[]> | Block[];
  selectionAnchorBlockId: string | null;
  selectionFocusBlockId: string | null;
  selectedBlockIds: string[];
  selectedBlocks: Block[];
  setSelection: (blockIds: string[]) => void;
};

export function handleSelectedBlockShortcut(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext
) {
  if (isModKey(event) && event.key.toLowerCase() === "a") {
    return handleSelectAllShortcut(event, context);
  }

  if (context.selectedBlocks.length === 0) {
    return handleNoSelectionShortcut(event, context);
  }

  if (
    isModKey(event) &&
    event.shiftKey &&
    (event.key === "ArrowUp" || event.key === "ArrowDown")
  ) {
    return handleKeyboardBlockMove(
      event,
      context,
      event.key === "ArrowUp" ? "up" : "down"
    );
  }

  if (event.key === "Tab") {
    return handleIndentShortcut(event, context);
  }

  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    return handleSelectionNavigation(event, context);
  }

  if (event.key === "Enter") {
    return handleEditSelectedBlock(event, context);
  }

  if (
    shouldIgnoreSelectedBlockShortcutTarget(
      event.target,
      context.selectedBlockIds
    )
  ) {
    return false;
  }

  return handleSelectedBlockCommand(event, context);
}

function handleSelectAllShortcut(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext
) {
  const nextSelection = getBlockSelectAllShortcutIds(
    context.document,
    context.selectedBlockIds,
    event.target
  );

  if (!nextSelection) {
    return false;
  }

  event.preventDefault();
  context.setSelection(nextSelection);
  return true;
}

function handleNoSelectionShortcut(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext
) {
  if (event.key !== "Escape") {
    return false;
  }

  const targetBlockId = getTargetBlockId(event.target);

  if (!targetBlockId || shouldIgnoreEditableEscapeTarget(event.target)) {
    return false;
  }

  event.preventDefault();
  context.setSelection([targetBlockId]);
  return true;
}

function handleKeyboardBlockMove(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext,
  direction: "down" | "up"
) {
  if (
    shouldIgnoreSelectedBlockShortcutTarget(
      event.target,
      context.selectedBlockIds
    )
  ) {
    return false;
  }

  const afterBlockId = getAfterBlockIdForKeyboardBlockMove(
    context.document.blocks,
    context.selectedBlockIds,
    direction
  );
  const movingBlocks = getBlocksWithDescendants(
    context.document.blocks,
    context.selectedBlocks
  );
  const safeAfterBlockId = getSubtreeSafeAfterBlockId(
    context.document.blocks,
    movingBlocks,
    afterBlockId ?? null
  );

  if (afterBlockId === undefined || safeAfterBlockId === undefined) {
    return false;
  }

  event.preventDefault();
  void context.onMoveBlocks(movingBlocks, safeAfterBlockId);
  return true;
}

function handleIndentShortcut(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext
) {
  if (
    shouldIgnoreSelectedBlockShortcutTarget(
      event.target,
      context.selectedBlockIds
    )
  ) {
    return false;
  }

  const updates = getIndentedSubtreeBlockUpdates(
    context.document.blocks,
    context.selectedBlocks,
    event.shiftKey ? "out" : "in"
  );

  if (updates.length === 0) {
    return false;
  }

  event.preventDefault();
  context.onIndentBlocks(updates);
  return true;
}

function handleSelectionNavigation(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext
) {
  if (
    shouldIgnoreSelectedBlockShortcutTarget(
      event.target,
      context.selectedBlockIds
    )
  ) {
    return false;
  }

  if (
    event.key === "ArrowUp" &&
    !event.shiftKey &&
    isFirstBlockFocused(
      context.document,
      context.selectionFocusBlockId,
      context.selectedBlockIds
    )
  ) {
    event.preventDefault();
    context.clearSelection();
    context.onFocusTitle();
    return true;
  }

  const nextSelection = getKeyboardBlockSelection(
    context.document.blocks,
    {
      anchorBlockId: context.selectionAnchorBlockId,
      focusBlockId: context.selectionFocusBlockId,
      selectedBlockIds: context.selectedBlockIds
    },
    event.key === "ArrowUp" ? "up" : "down",
    event.shiftKey
  );

  if (!nextSelection) {
    return false;
  }

  event.preventDefault();
  context.onKeyboardSelection(nextSelection);
  return true;
}

function handleEditSelectedBlock(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext
) {
  if (
    shouldIgnoreSelectedBlockShortcutTarget(
      event.target,
      context.selectedBlockIds
    )
  ) {
    return false;
  }

  const targetBlockId = getSelectedBlockEditTargetId(
    context.selectedBlockIds,
    context.selectionFocusBlockId
  );

  if (!targetBlockId) {
    return false;
  }

  event.preventDefault();
  context.clearSelection();
  context.onFocusBlock(targetBlockId);
  return true;
}

function handleSelectedBlockCommand(
  event: KeyboardEvent,
  context: SelectedBlockShortcutContext
) {
  if (isModKey(event) && event.key.toLowerCase() === "c") {
    event.preventDefault();
    void copyBlocksToClipboard(
      context.document,
      getBlocksWithDescendants(context.document.blocks, context.selectedBlocks)
    );
    return true;
  }

  if (isModKey(event) && event.key.toLowerCase() === "v") {
    event.preventDefault();
    const afterBlock = context.selectedBlocks[context.selectedBlocks.length - 1];
    void Promise.resolve(context.onPasteBlocks(afterBlock)).then((createdBlocks) => {
      if (createdBlocks.length > 0) {
        context.setSelection(createdBlocks.map((block) => block.id));
      }
    });
    return true;
  }

  if (isModKey(event) && event.key.toLowerCase() === "d") {
    event.preventDefault();
    context.onDuplicateBlocks(context.selectedBlocks);
    return true;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    context.onDeleteBlocks(context.selectedBlocks);
    context.clearSelection();
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    context.clearSelection();
    return true;
  }

  return false;
}

function isFirstBlockFocused(
  document: PageDocument,
  selectionFocusBlockId: string | null,
  selectedBlockIds: string[]
) {
  const firstBlockId = document.blocks[0]?.id;
  const focusBlockId = selectionFocusBlockId ?? selectedBlockIds.at(-1) ?? null;

  return Boolean(firstBlockId && focusBlockId === firstBlockId);
}

function isModKey(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}
