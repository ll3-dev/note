import { describe, expect, test } from "bun:test";
import { resolveKeybinding } from "@/mainview/features/commands/keybindingResolver";
import { WORKSPACE_COMMANDS } from "./workspaceCommands";

describe("workspace commands", () => {
  test("toggles the sidebar with Mod+Backslash", () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        closeActiveTab: async () => {},
        openQuickSwitcher: () => {},
        toggleSidebar: () => {
          calls.push("toggleSidebar");
        }
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "\\",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.sidebar.toggle");
    command?.run({
      closeActiveTab: async () => {},
      openQuickSwitcher: () => {},
      toggleSidebar: () => {
        calls.push("toggleSidebar");
      }
    });
    expect(calls).toEqual(["toggleSidebar"]);
  });

  test("closes the active tab with Mod+W", async () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        closeActiveTab: async () => {
          calls.push("closeActiveTab");
        },
        openQuickSwitcher: () => {},
        toggleSidebar: () => {}
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "w",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.tab.closeActive");
    await command?.run({
      closeActiveTab: async () => {
        calls.push("closeActiveTab");
      },
      openQuickSwitcher: () => {},
      toggleSidebar: () => {}
    });
    expect(calls).toEqual(["closeActiveTab"]);
  });

  test("opens the quick switcher with Mod+P", () => {
    const calls: string[] = [];
    const command = resolveKeybinding({
      activeScopes: ["global", "workspace"],
      commands: WORKSPACE_COMMANDS,
      context: {
        closeActiveTab: async () => {},
        openQuickSwitcher: () => {
          calls.push("openQuickSwitcher");
        },
        toggleSidebar: () => {}
      },
      event: {
        altKey: false,
        ctrlKey: false,
        key: "p",
        metaKey: true,
        shiftKey: false
      }
    });

    expect(command?.id).toBe("workspace.quickSwitcher.open");
    command?.run({
      closeActiveTab: async () => {},
      openQuickSwitcher: () => {
        calls.push("openQuickSwitcher");
      },
      toggleSidebar: () => {}
    });
    expect(calls).toEqual(["openQuickSwitcher"]);
  });
});
