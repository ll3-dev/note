import type { KeyboardEvent } from "react";
import type { Command } from "@/mainview/features/commands/types";
import type { Block } from "../../../../shared/contracts";
import { getBlockIndentUpdate, getNextBlockDraft } from "./blockEditingBehavior";
import { isCursorAtEnd, isCursorAtStart } from "./domSelection";
import type { BlockEditorUpdate } from "../types/blockEditorTypes";

export type BlockShortcutContext = {
  block: Block;
  blocksCount: number;
  applySelectedCommand: () => void;
  closeCommandMenu: () => void;
  commitDraft: () => Promise<void>;
  draft: string;
  event: KeyboardEvent<HTMLElement>;
  isCommandMenuOpen: boolean;
  maxIndentDepth: number;
  onCreateAfter: (
    block: Block,
    draft?: ReturnType<typeof getNextBlockDraft>
  ) => Promise<void>;
  onDelete: (block: Block) => void;
  onFocusNext: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
  onUpdate: (block: Block, changes: BlockEditorUpdate) => void;
  selectNextCommand: () => void;
  selectPreviousCommand: () => void;
};

export const BLOCK_EDITOR_COMMANDS: Command<BlockShortcutContext>[] = [
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
    defaultKeybindings: ["Enter"],
    id: "editor.block.createBelow",
    scope: "block",
    title: "Create block below",
    run: async ({ block, commitDraft, onCreateAfter }) => {
      await commitDraft();
      await onCreateAfter(block, getNextBlockDraft(block));
    }
  },
  {
    canRun: ({ block, event }) =>
      block.type !== "paragraph" && isCursorAtStart(event.currentTarget),
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
    canRun: ({ event }) => isCursorAtStart(event.currentTarget),
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
    canRun: ({ event }) => isCursorAtEnd(event.currentTarget),
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
    run: ({ block, maxIndentDepth, onUpdate }) => {
      const update = getBlockIndentUpdate(block, "in", maxIndentDepth);

      if (update) {
        onUpdate(block, update);
      }
    }
  },
  {
    defaultKeybindings: ["Shift+Tab"],
    id: "editor.block.outdent",
    scope: "block",
    title: "Outdent block",
    run: ({ block, onUpdate }) => {
      const update = getBlockIndentUpdate(block, "out");

      if (update) {
        onUpdate(block, update);
      }
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
