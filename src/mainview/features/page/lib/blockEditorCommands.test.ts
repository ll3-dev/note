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
    event: {} as BlockShortcutContext["event"],
    isCommandMenuOpen: true,
    maxIndentDepth: 1,
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
    onUpdate: (_block, changes) => {
      calls.push(`onUpdate:${changes.type}`);
    },
    selectNextCommand: () => {
      calls.push("selectNextCommand");
    },
    selectPreviousCommand: () => {
      calls.push("selectPreviousCommand");
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

  test("resets a non-paragraph block before deleting an empty block", () => {
    const { calls, context } = createContext({
      block: {
        ...block,
        text: "",
        type: "heading_1"
      },
      blocksCount: 2,
      draft: "",
      event: {
        currentTarget: createEditableAtStart()
      } as BlockShortcutContext["event"],
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
});

function createEditableAtStart() {
  const node = {};
  const range = {
    cloneRange: () => ({
      selectNodeContents: () => {},
      setEnd: () => {},
      toString: () => ""
    }),
    startContainer: node,
    startOffset: 0
  };

  globalThis.window = {
    getSelection: () => ({
      getRangeAt: () => range,
      isCollapsed: true,
      rangeCount: 1
    })
  } as unknown as Window & typeof globalThis;

  return {
    contains: (target: unknown) => target === node,
    textContent: ""
  } as HTMLElement;
}
