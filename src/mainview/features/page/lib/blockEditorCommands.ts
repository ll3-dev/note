import type { KeyboardEvent } from "react";
import type { Command } from "@/mainview/features/commands/types";
import type { Block } from "../../../../shared/contracts";
import { isCursorAtEnd, isCursorAtStart } from "./domSelection";

export type BlockShortcutContext = {
  block: Block;
  blocksCount: number;
  applySelectedCommand: () => void;
  closeCommandMenu: () => void;
  commitDraft: () => void;
  draft: string;
  event: KeyboardEvent<HTMLElement>;
  isCommandMenuOpen: boolean;
  onCreateAfter: (block: Block) => Promise<void>;
  onDelete: (block: Block) => void;
  onFocusNext: (block: Block) => void;
  onFocusPrevious: (block: Block) => void;
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
      commitDraft();
      await onCreateAfter(block);
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
    run: ({ block, commitDraft, onFocusPrevious }) => {
      commitDraft();
      onFocusPrevious(block);
    }
  },
  {
    canRun: ({ event }) => isCursorAtEnd(event.currentTarget),
    defaultKeybindings: ["ArrowDown"],
    id: "editor.block.focusNext",
    scope: "block",
    title: "Focus next block",
    run: ({ block, commitDraft, onFocusNext }) => {
      commitDraft();
      onFocusNext(block);
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
