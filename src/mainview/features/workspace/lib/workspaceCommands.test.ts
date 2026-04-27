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
      toggleSidebar: () => {}
    });
    expect(calls).toEqual(["closeActiveTab"]);
  });
});
