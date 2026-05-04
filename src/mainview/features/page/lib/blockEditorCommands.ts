import type { Command } from "@/mainview/features/commands/types";
import type { Block, BlockType } from "@/shared/contracts";
import {
  getBlockDepth,
  getBlockIndentUpdate,
  getNextBlockDraft,
  getSplitBlockDraft
} from "./blockEditingBehavior";
import type { BlockEditorUpdate } from "@/mainview/features/page/types/blockEditorTypes";
import type { CreateBlockOptions } from "@/mainview/features/page/types/blockEditorTypes";

const EMPTY_ENTER_RESET_TYPES = new Set<BlockType>([
  "bulleted_list",
  "numbered_list",
  "quote",
  "todo",
  "toggle",
  "callout"
]);

export type BlockShortcutContext = {
  block: Block;
  blocksCount: number;
  applyInlineFormat: (commandId: string) => void;
  applySelectedCommand: () => void;
  closeCommandMenu: () => void;
  commitDraft: () => Promise<void>;
  draft: string;
  draftProps: Block["props"];
  getCursorOffset: () => number | null;
  isCommandMenuOpen: boolean;
  maxIndentDepth: number;
  numberedListMarker: number | null;
  numberedListStartAfterIndent: number | null;
  numberedListStartAfterOutdent: number | null;
  onCreateAfter: (
    block: Block,
    draft?: ReturnType<typeof getNextBlockDraft>,
    options?: CreateBlockOptions
  ) => Promise<void>;
  onDelete: (block: Block) => void;
  onFocusNext: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
  onMergeWithPrevious: (
    previousBlock: Block,
    block: Block,
    text: string,
    props: Block["props"]
  ) => Promise<void> | void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  openSearch: () => void;
  previousBlock: Block | null;
  redoTextDraft: () => void;
  selectNextCommand: () => void;
  selectPreviousCommand: () => void;
  undoTextDraft: () => void;
};

export const BLOCK_EDITOR_COMMANDS: Command<BlockShortcutContext>[] = [
  {
    defaultKeybindings: ["Mod+Z"],
    id: "editor.history.undoText",
    scope: "block",
    title: "Undo text edit",
    run: async ({ commitDraft, undoTextDraft }) => {
      await commitDraft();
      await undoTextDraft();
    }
  },
  {
    defaultKeybindings: ["Mod+Shift+Z"],
    id: "editor.history.redoText",
    scope: "block",
    title: "Redo text edit",
    run: async ({ commitDraft, redoTextDraft }) => {
      await commitDraft();
      await redoTextDraft();
    }
  },
  {
    defaultKeybindings: ["Mod+B"],
    id: "editor.inline.bold",
    scope: "block",
    title: "Bold selected text",
    run: ({ applyInlineFormat }) => {
      applyInlineFormat("format-bold");
    }
  },
  {
    defaultKeybindings: ["Mod+I"],
    id: "editor.inline.italic",
    scope: "block",
    title: "Italic selected text",
    run: ({ applyInlineFormat }) => {
      applyInlineFormat("format-italic");
    }
  },
  {
    defaultKeybindings: ["Mod+E"],
    id: "editor.inline.code",
    scope: "block",
    title: "Inline code selected text",
    run: ({ applyInlineFormat }) => {
      applyInlineFormat("format-inline-code");
    }
  },
  {
    canRun: ({ isCommandMenuOpen }) => isCommandMenuOpen,
    defaultKeybindings: ["Enter"],
    id: "editor.commandMenu.applySelected",
    scope: "commandMenu",
    title: "Apply selected command",
    run: ({ applySelectedCommand }) => {
      applySelectedCommand();
    }
  },
  {
    canRun: ({ isCommandMenuOpen }) => isCommandMenuOpen,
    defaultKeybindings: ["ArrowDown"],
    id: "editor.commandMenu.selectNext",
    scope: "commandMenu",
    title: "Select next command",
    run: ({ selectNextCommand }) => {
      selectNextCommand();
    }
  },
  {
    canRun: ({ isCommandMenuOpen }) => isCommandMenuOpen,
    defaultKeybindings: ["ArrowUp"],
    id: "editor.commandMenu.selectPrevious",
    scope: "commandMenu",
    title: "Select previous command",
    run: ({ selectPreviousCommand }) => {
      selectPreviousCommand();
    }
  },
  {
    canRun: ({ block, draft }) =>
      EMPTY_ENTER_RESET_TYPES.has(block.type) && draft.length === 0,
    defaultKeybindings: ["Enter"],
    id: "editor.block.resetEmptyStructuredBlock",
    scope: "block",
    title: "Reset empty structured block",
    run: async ({ block, commitDraft, onUpdate }) => {
      await commitDraft();
      const depth = getBlockDepth(block);

      onUpdate(block, {
        props: depth > 0 ? { depth } : {},
        type: "paragraph"
      });
    }
  },
  {
    canRun: ({ draft, getCursorOffset }) => {
      const offset = getCursorOffset();

      return offset !== null && offset > 0 && offset < draft.length;
    },
    defaultKeybindings: ["Enter"],
    id: "editor.block.splitAtCursor",
    scope: "block",
    title: "Split block at cursor",
    run: async ({
      block,
      draft,
      draftProps,
      getCursorOffset,
      numberedListMarker,
      onCreateAfter,
      onUpdate
    }) => {
      const offset = getCursorOffset();

      if (offset === null) {
        return;
      }

      const splitDraft = getSplitBlockDraft(
        block,
        draft,
        draftProps,
        offset,
        numberedListMarker ?? undefined
      );

      const currentUpdate =
        block.type === "toggle" && draftProps.open === false
          ? { ...splitDraft.currentUpdate, props: { ...splitDraft.currentUpdate.props, open: true } }
          : splitDraft.currentUpdate;

      onUpdate(block, currentUpdate);
      await onCreateAfter(block, splitDraft.nextDraft, {
        focusPlacement: "start",
        parentBlockId: block.parentBlockId
      });
    }
  },
  {
    defaultKeybindings: ["Enter"],
    id: "editor.block.createBelow",
    scope: "block",
    title: "Create block below",
    run: async ({ block, commitDraft, draftProps, numberedListMarker, onCreateAfter, onUpdate }) => {
      await commitDraft();

      if (block.type === "toggle" && draftProps.open === false) {
        onUpdate(block, { props: { ...draftProps, open: true } });
      }

      await onCreateAfter(
        block,
        getNextBlockDraft(block, numberedListMarker ?? undefined),
        {
          parentBlockId: block.parentBlockId
        }
      );
    }
  },
  {
    canRun: ({ block }) => block.type === "page_link",
    defaultKeybindings: ["Backspace", "Delete"],
    id: "editor.block.deletePageLink",
    scope: "block",
    title: "Delete page block",
    run: ({ block, onDelete, onFocusPrevious }) => {
      onFocusPrevious(block);
      onDelete(block);
    }
  },
  {
    canRun: ({ block, getCursorOffset }) =>
      block.type !== "paragraph" && getCursorOffset() === 0,
    defaultKeybindings: ["Backspace"],
    id: "editor.block.resetToParagraph",
    scope: "block",
    title: "Reset block to paragraph",
    run: ({ block, onUpdate }) => {
      onUpdate(block, {
        props: {},
        type: "paragraph"
      });
    }
  },
  {
    canRun: ({ blocksCount, draft }) => draft.length === 0 && blocksCount > 1,
    defaultKeybindings: ["Backspace"],
    id: "editor.block.deleteEmpty",
    scope: "block",
    title: "Delete empty block",
    run: ({ block, onDelete, onFocusPrevious }) => {
      onFocusPrevious(block);
      onDelete(block);
    }
  },
  {
    canRun: ({ block, draft, getCursorOffset, previousBlock }) =>
      block.type === "paragraph" &&
      draft.length > 0 &&
      previousBlock !== null &&
      previousBlock.type !== "divider" &&
      getCursorOffset() === 0,
    defaultKeybindings: ["Backspace"],
    id: "editor.block.mergeWithPrevious",
    scope: "block",
    title: "Merge block with previous",
    run: async ({ block, draft, draftProps, onMergeWithPrevious, previousBlock }) => {
      if (!previousBlock) {
        return;
      }

      await onMergeWithPrevious(previousBlock, block, draft, draftProps);
    }
  },
  {
    canRun: ({ block, getCursorOffset }) =>
      block.type === "page_link" || getCursorOffset() === 0,
    defaultKeybindings: ["ArrowUp"],
    id: "editor.block.focusPrevious",
    scope: "block",
    title: "Focus previous block",
    run: async ({ block, commitDraft, onFocusPrevious }) => {
      await commitDraft();
      onFocusPrevious(block);
    }
  },
  {
    canRun: ({ block, draft, getCursorOffset }) =>
      block.type === "page_link" || getCursorOffset() === draft.length,
    defaultKeybindings: ["ArrowDown"],
    id: "editor.block.focusNext",
    scope: "block",
    title: "Focus next block",
    run: async ({ block, commitDraft, onFocusNext }) => {
      await commitDraft();
      onFocusNext(block);
    }
  },
  {
    defaultKeybindings: ["Tab"],
    id: "editor.block.indent",
    scope: "block",
    title: "Indent block",
    run: ({ block, maxIndentDepth, numberedListStartAfterIndent, onUpdate }) => {
      const update = getBlockIndentUpdate(block, "in", maxIndentDepth);

      if (update) {
        updateNumberedListStart(block, update, numberedListStartAfterIndent);
        onUpdate(block, update);
      }
    }
  },
  {
    defaultKeybindings: ["Shift+Tab"],
    id: "editor.block.outdent",
    scope: "block",
    title: "Outdent block",
    run: ({ block, numberedListStartAfterOutdent, onUpdate }) => {
      const update = getBlockIndentUpdate(block, "out");

      if (update) {
        updateNumberedListStart(block, update, numberedListStartAfterOutdent);
        onUpdate(block, update);
      }
    }
  },
  {
    defaultKeybindings: ["Mod+F"],
    id: "editor.search.open",
    scope: "block",
    title: "Open search",
    run: ({ openSearch }) => {
      openSearch();
    }
  },
  {
    canRun: ({ isCommandMenuOpen }) => isCommandMenuOpen,
    defaultKeybindings: ["Escape"],
    id: "editor.commandMenu.close",
    scope: "commandMenu",
    title: "Close command menu",
    run: ({ closeCommandMenu }) => {
      closeCommandMenu();
    }
  }
];

function updateNumberedListStart(
  block: Block,
  update: { props: Record<string, unknown> },
  start: number | null
) {
  if (block.type !== "numbered_list" || start === null) {
    return;
  }

  update.props.start = start;
}
