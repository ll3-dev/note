import { describe, expect, test } from "bun:test";
import { resolveKeybinding } from "@/mainview/features/commands/keybindingResolver";
import { BLOCK_EDITOR_COMMANDS, type BlockShortcutContext } from "./blockEditorCommands";

const block = {
  createdAt: "2026-04-27T00:00:00.000Z",
  id: "block-1",
  pageId: "page-1",
  parentBlockId: null,
  props: {},
  sortKey: "a0",
  text: "/",
  type: "paragraph",
  updatedAt: "2026-04-27T00:00:00.000Z"
} as const;

function createContext(overrides: Partial<BlockShortcutContext> = {}) {
  const calls: string[] = [];
  const context: BlockShortcutContext = {
    applyInlineFormat: (commandId) => {
      calls.push(`applyInlineFormat:${commandId}`);
    },
    applySelectedCommand: () => {
      calls.push("applySelectedCommand");
    },
    block,
    blocksCount: 1,
    closeCommandMenu: () => {
      calls.push("closeCommandMenu");
    },
    commitDraft: async () => {
      calls.push("commitDraft");
    },
    draft: "/",
    draftProps: {},
    getCursorOffset: () => null,
    isCommandMenuOpen: true,
    maxIndentDepth: 1,
    numberedListMarker: null,
    numberedListStartAfterIndent: null,
    numberedListStartAfterOutdent: null,
    onCreateAfter: async () => {
      calls.push("onCreateAfter");
    },
    onDelete: () => {
      calls.push("onDelete");
    },
    onFocusNext: () => {
      calls.push("onFocusNext");
    },
    onFocusPrevious: () => {
      calls.push("onFocusPrevious");
    },
    onMergeWithPrevious: async () => {
      calls.push("onMergeWithPrevious");
    },
    onUpdate: (_block, changes) => {
      calls.push(`onUpdate:${changes.type}`);
    },
    previousBlock: null,
    redoTextDraft: () => {
      calls.push("redoTextDraft");
    },
    selectNextCommand: () => {
      calls.push("selectNextCommand");
    },
    selectPreviousCommand: () => {
      calls.push("selectPreviousCommand");
    },
    undoTextDraft: () => {
      calls.push("undoTextDraft");
    },
    ...overrides
  } as BlockShortcutContext;

  return { calls, context };
}

describe("block editor commands", () => {
  test("continues list blocks when creating a block below", async () => {
    const createdDrafts: unknown[] = [];
    const { calls, context } = createContext({
      block: {
        ...block,
        props: { depth: 1 },
        type: "bulleted_list"
      },
      onCreateAfter: async (_block, draft) => {
        calls.push("onCreateAfter");
        createdDrafts.push(draft);
      }
    });
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Enter",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("editor.block.createBelow");
    await command?.run(context);
    expect(calls).toEqual(["commitDraft", "onCreateAfter"]);
    expect(createdDrafts).toEqual([
      {
        props: { depth: 1 },
        type: "bulleted_list"
      }
    ]);
  });

  test("continues numbered list blocks from the displayed marker", async () => {
    const createdDrafts: unknown[] = [];
    const { calls, context } = createContext({
      block: {
        ...block,
        props: { start: 5 },
        type: "numbered_list"
      },
      numberedListMarker: 7,
      onCreateAfter: async (_block, draft) => {
        calls.push("onCreateAfter");
        createdDrafts.push(draft);
      }
    });
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Enter",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("editor.block.createBelow");
    await command?.run(context);
    expect(calls).toEqual(["commitDraft", "onCreateAfter"]);
    expect(createdDrafts).toEqual([
      {
        props: { start: 8 },
        type: "numbered_list"
      }
    ]);
  });

  test.each([
    "bulleted_list",
    "numbered_list",
    "quote",
    "todo",
    "toggle"
  ] as const)("resets an empty %s block to paragraph on Enter", async (type) => {
    const updates: unknown[] = [];
    const { calls, context } = createContext({
      block: {
        ...block,
        props: type === "todo" ? { checked: true, depth: 1 } : { depth: 1 },
        type
      },
      draft: "",
      onUpdate: (_block, changes) => {
        calls.push(`onUpdate:${changes.type}`);
        updates.push(changes);
      }
    });
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Enter",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("editor.block.resetEmptyStructuredBlock");
    await command?.run(context);
    expect(calls).toEqual(["commitDraft", "onUpdate:paragraph"]);
    expect(updates).toEqual([{ props: { depth: 1 }, type: "paragraph" }]);
  });

  test("resets heading blocks to paragraph when creating below", async () => {
    const createdDrafts: unknown[] = [];
    const { context } = createContext({
      block: {
        ...block,
        props: { depth: 2 },
        type: "heading_1"
      },
      onCreateAfter: async (_block, draft) => {
        createdDrafts.push(draft);
      }
    });
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Enter",
        metaKey: false,
        shiftKey: false
      }
    });

    await command?.run(context);
    expect(createdDrafts).toEqual([
      {
        props: { depth: 2 },
        type: "paragraph"
      }
    ]);
  });

  test("closes slash command menu with Escape", () => {
    const { calls, context } = createContext();
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block", "commandMenu"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Escape",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("editor.commandMenu.close");
    command?.run(context);
    expect(calls).toEqual(["closeCommandMenu"]);
  });

  test("moves slash command selection with ArrowDown and ArrowUp", () => {
    const { calls, context } = createContext();

    const nextCommand = resolveKeybinding({
      activeScopes: ["global", "editor", "block", "commandMenu"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "ArrowDown",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(nextCommand?.id).toBe("editor.commandMenu.selectNext");
    nextCommand?.run(context);

    const previousCommand = resolveKeybinding({
      activeScopes: ["global", "editor", "block", "commandMenu"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "ArrowUp",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(previousCommand?.id).toBe("editor.commandMenu.selectPrevious");
    previousCommand?.run(context);
    expect(calls).toEqual(["selectNextCommand", "selectPreviousCommand"]);
  });

  test("applies selected slash command with Enter", () => {
    const { calls, context } = createContext();
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block", "commandMenu"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Enter",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("editor.commandMenu.applySelected");
    command?.run(context);
    expect(calls).toEqual(["applySelectedCommand"]);
  });

  test("maps Mod+Z and Mod+Shift+Z to text history", async () => {
    const { calls, context } = createContext();
    const undoCommand = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "z",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(undoCommand?.id).toBe("editor.history.undoText");
    await undoCommand?.run(context);

    const redoCommand = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "z",
        metaKey: true,
        shiftKey: true
      }
    });

    expect(redoCommand?.id).toBe("editor.history.redoText");
    await redoCommand?.run(context);
    expect(calls).toEqual([
      "commitDraft",
      "undoTextDraft",
      "commitDraft",
      "redoTextDraft"
    ]);
  });

  test("resets a non-paragraph block before deleting an empty block", () => {
    const { calls, context } = createContext({
      block: {
        ...block,
        text: "",
        type: "heading_1"
      },
      blocksCount: 2,
      draft: "",
      getCursorOffset: () => 0,
      isCommandMenuOpen: false
    });
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Backspace",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("editor.block.resetToParagraph");
    command?.run(context);
    expect(calls).toEqual(["onUpdate:paragraph"]);
  });

  test("indents and outdents blocks with Tab and Shift+Tab", () => {
    const { calls, context } = createContext({
      isCommandMenuOpen: false
    });
    const indentCommand = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Tab",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(indentCommand?.id).toBe("editor.block.indent");
    indentCommand?.run(context);
    expect(calls).toEqual(["onUpdate:undefined"]);

    const outdentContext = {
      ...context,
      block: {
        ...block,
        props: { depth: 1 }
      }
    };
    const outdentCommand = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context: outdentContext,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Tab",
        metaKey: false,
        shiftKey: true
      }
    });

    expect(outdentCommand?.id).toBe("editor.block.outdent");
  });

  test("does not skip parent depth when indenting", () => {
    const { calls, context } = createContext({
      block: {
        ...block,
        props: { depth: 1 }
      },
      isCommandMenuOpen: false,
      maxIndentDepth: 1
    });
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Tab",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("editor.block.indent");
    command?.run(context);
    expect(calls).toEqual([]);
  });

  test("renumbers numbered lists when changing depth", () => {
    const updates: unknown[] = [];
    const { context } = createContext({
      block: {
        ...block,
        props: { depth: 1, start: 1 },
        type: "numbered_list"
      },
      isCommandMenuOpen: false,
      numberedListStartAfterOutdent: 2,
      onUpdate: (_block, changes) => {
        updates.push(changes);
      }
    });
    const command = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands: BLOCK_EDITOR_COMMANDS,
      context,
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Tab",
        metaKey: false,
        shiftKey: true
      }
    });

    expect(command?.id).toBe("editor.block.outdent");
    command?.run(context);
    expect(updates).toEqual([{ props: { start: 2 } }]);
  });
});
