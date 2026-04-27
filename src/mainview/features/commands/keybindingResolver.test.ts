import { describe, expect, test } from "bun:test";
import {
  eventToKeybinding,
  findKeybindingConflicts,
  normalizeKeybinding,
  resolveKeybinding
} from "./keybindingResolver";
import type { Command } from "./types";

type TestContext = {
  canRun?: boolean;
  ran: string[];
};

const commands: Command<TestContext>[] = [
  {
    defaultKeybindings: ["Mod+K"],
    id: "global.search",
    scope: "global",
    title: "Search",
    run: (context) => {
      context.ran.push("global.search");
    }
  },
  {
    defaultKeybindings: ["Mod+K"],
    id: "editor.commandPalette",
    scope: "editor",
    title: "Command palette",
    run: (context) => {
      context.ran.push("editor.commandPalette");
    }
  },
  {
    canRun: (context) => context.canRun !== false,
    defaultKeybindings: ["Backspace"],
    id: "block.deleteEmpty",
    scope: "block",
    title: "Delete empty block",
    run: (context) => {
      context.ran.push("block.deleteEmpty");
    }
  }
];

describe("keybinding resolver", () => {
  test("normalizes shortcut strings into a stable modifier order", () => {
    expect(normalizeKeybinding("shift+mod+k")).toBe("Mod+Shift+K");
    expect(normalizeKeybinding("Alt+Ctrl+Enter")).toBe("Ctrl+Alt+Enter");
  });

  test("converts keyboard events into platform-aware keybindings", () => {
    expect(
      eventToKeybinding({
        altKey: false,
        ctrlKey: false,
        key: "k",
        metaKey: true,
        shiftKey: true
      })
    ).toBe("Mod+Shift+K");

    expect(
      eventToKeybinding(
        {
          altKey: false,
          ctrlKey: true,
          key: "k",
          metaKey: false,
          shiftKey: false
        },
        "windows"
      )
    ).toBe("Mod+K");

    expect(
      eventToKeybinding({
        altKey: false,
        ctrlKey: false,
        key: "\\",
        metaKey: true,
        shiftKey: false
      })
    ).toBe("Mod+\\");
  });

  test("prefers the narrowest active scope for matching shortcuts", () => {
    const match = resolveKeybinding({
      activeScopes: ["global", "editor"],
      commands,
      context: { ran: [] },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "k",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(match?.id).toBe("editor.commandPalette");
  });

  test("uses user overrides instead of default keybindings for a command", () => {
    const oldMatch = resolveKeybinding({
      activeScopes: ["global", "editor"],
      commands,
      context: { ran: [] },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "k",
        metaKey: true,
        shiftKey: false
      },
      keybindings: [
        {
          commandId: "editor.commandPalette",
          enabled: true,
          keys: ["Mod+Shift+P"],
          source: "user"
        }
      ]
    });

    expect(oldMatch?.id).toBe("global.search");

    const newMatch = resolveKeybinding({
      activeScopes: ["global", "editor"],
      commands,
      context: { ran: [] },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "p",
        metaKey: true,
        shiftKey: true
      },
      keybindings: [
        {
          commandId: "editor.commandPalette",
          enabled: true,
          keys: ["Mod+Shift+P"],
          source: "user"
        }
      ]
    });

    expect(newMatch?.id).toBe("editor.commandPalette");
  });

  test("skips commands that cannot run in the current context", () => {
    const match = resolveKeybinding({
      activeScopes: ["global", "editor", "block"],
      commands,
      context: { canRun: false, ran: [] },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "Backspace",
        metaKey: false,
        shiftKey: false
      }
    });

    expect(match).toBeNull();
  });

  test("reports shortcut conflicts inside the same scope only", () => {
    const conflicts = findKeybindingConflicts([
      ...commands,
      {
        defaultKeybindings: ["Backspace"],
        id: "block.mergePrevious",
        scope: "block",
        title: "Merge with previous block",
        run: () => {}
      }
    ]);

    expect(conflicts).toEqual([
      {
        commandIds: ["block.deleteEmpty", "block.mergePrevious"],
        key: "Backspace",
        scope: "block"
      }
    ]);
  });
});
